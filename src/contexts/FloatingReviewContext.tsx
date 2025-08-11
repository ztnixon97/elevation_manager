// src/contexts/FloatingReviewContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Review {
  id: number;
  product_id: number;
  review_status: string;
  product_status: string;
  created_at: string;
  updated_at: string;
  product_name?: string;
  reviewer_name?: string;
  content?: string;
}

interface FloatingReviewContextType {
  currentReview: Review | null;
  isFloatingOpen: boolean;
  openFloatingReview: (review: Review) => void;
  closeFloatingReview: () => void;
  updateFloatingReview: (review: Review) => void;
}

const FloatingReviewContext = createContext<FloatingReviewContextType | undefined>(undefined);

export const useFloatingReview = () => {
  const context = useContext(FloatingReviewContext);
  if (!context) {
    throw new Error('useFloatingReview must be used within a FloatingReviewProvider');
  }
  return context;
};

interface FloatingReviewProviderProps {
  children: ReactNode;
}

export const FloatingReviewProvider: React.FC<FloatingReviewProviderProps> = ({ children }) => {
  const [currentReview, setCurrentReview] = useState<Review | null>(null);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);

  const openFloatingReview = (review: Review) => {
    setCurrentReview(review);
    setIsFloatingOpen(true);
  };

  const closeFloatingReview = () => {
    setIsFloatingOpen(false);
    // Keep the review data for a moment to allow for smooth closing animation
    setTimeout(() => setCurrentReview(null), 300);
  };

  const updateFloatingReview = (review: Review) => {
    setCurrentReview(review);
  };

  return (
    <FloatingReviewContext.Provider
      value={{
        currentReview,
        isFloatingOpen,
        openFloatingReview,
        closeFloatingReview,
        updateFloatingReview,
      }}
    >
      {children}
    </FloatingReviewContext.Provider>
  );
};