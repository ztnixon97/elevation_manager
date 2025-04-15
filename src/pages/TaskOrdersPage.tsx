import { invoke } from '@tauri-apps/api/core';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';



interface TaskOrderDetails {
    id: number;
    contract_id: number;
    name: string;
    producer: string;
    cor: string;
    period_of_performance: string;
    price: string;
    status: string;
    created_at: string;
}

interface ProductDetails {
    id: number;
    site_id: string;
    item_id: string;
    status: string;
    product_type_id: number;
    product_type_name?: string;
    team_id?: number;
    team_name?: string;
    geom?: string; // EWKT WKT string
    classification?: string;
    acceptance_date?: string;
    publish_date?: string;
    created_at: string;
    updated_at: string;
  }


  const TaskOrderPage: React.FC = () => {
    const { taskOrderId } = useParams<{ taskOrderId: string }>();
    const Navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [taskOrder, setTaskOrder] = useState<TaskOrderDetails | null>(null);
    const [products, setProducts] = useState<ProductDetails[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const mapElement = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const fetchTaskOrderDetails = async () => {
            try {
                setLoading(true);
                const response = await invoke<string | object>('get_task_order' , {
                    taskorder_id: taskOrderId,
                });
                const data = typeof response === 'string' ? JSON.parse(response): response;

                if (data.success && data.data) {
                    console.log("Task Order Data:", data.data);
                    setTaskOrder({
                        id: data.data.id,
                        contract_id: data.data.contract_id,
                        name: data.data.name,
                        producer: data.data.producer,
                        cor: data.data.cor,
                        period_of_performance: data.data.pop,
                        price: data.data.price,
                        status: data.data.status,
                        created_at: data.data.created_at,
                    });
                } else {
                    throw new Error
                }

                const productResponse = await invoke<string | object>('get_taskorder_products', {
                    taskorder_id: taskOrderId,
                });
                const productData = typeof productResponse === 'string' ? JSON.parse(productResponse) : productResponse;
            }
        }
    })
  }

  export default TaskOrderPage;