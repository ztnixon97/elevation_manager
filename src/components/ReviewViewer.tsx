// src/components/ReviewViewer.jsx
import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import './Tiptap.css';
import { format, parseISO } from 'date-fns';

// Review status colors
const getStatusColor = (status) => {
  switch (status) {
    case 'draft': return 'default';
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    default: return 'default';
  }
};

const ReviewViewer = ({ review, content }) => {
  // Configure the TipTap editor in read-only mode
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: true,
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editable: false,
  });

  if (!review) {
    return (
      <Box textAlign="center" p={3}>
        <Typography color="text.secondary">No review selected</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          {review.title || `Review for Product #${review.product_id}`}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Chip 
            label={`Status: ${review.review_status}`}
            color={getStatusColor(review.review_status)}
          />
          
          <Chip 
            label={`Product Status: ${review.product_status}`}
            variant="outlined"
          />
          
          <Typography variant="caption" color="text.secondary">
            Last updated: {format(parseISO(review.updated_at), 'MMM d, yyyy h:mm a')}
          </Typography>
        </Box>
      </Box>
      
      <Paper 
        elevation={1} 
        sx={{ 
          p: 3,
          borderRadius: 1,
          '.ProseMirror': {
            minHeight: 'auto',
            padding: 0
          }
        }}
      >
        <EditorContent editor={editor} />
      </Paper>
    </Box>
  );
};

export default ReviewViewer;