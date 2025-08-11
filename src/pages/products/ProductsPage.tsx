// src/pages/products/ProductsPage.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProductsList from './ProductsList';
import ProductDetails from './ProductDetails';
import ProductCreate from './ProductCreate';

const ProductsPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ProductsList />} />
      <Route path="/create" element={<ProductCreate />} />
      <Route path="/:productId" element={<ProductDetails />} />
    </Routes>
  );
};

export default ProductsPage;