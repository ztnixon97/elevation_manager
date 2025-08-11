// src/components/ReviewApprovalDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  RateReview as ReviewIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

interface Review {
  id: number;
  product_id: number;
  reviewer_id: number;
  review_status: string;
  product_status: string;
  created_at: string;
  updated_at: string;
  product_name?: string;
}

interface ReviewApprovalDialogProps {
  open: boolean;
  review: Review | null;
  onClose: () => void;
  onApprove: (review: Review, comments?: string, productStatus?: string) => Promise<void>;
  onReject: (review: Review, comments?: string, reason?: string) => Promise<void>;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'draft': return 'default';
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    default: return 'default';
  }
};

const ReviewApprovalDialog: React.FC<ReviewApprovalDialogProps> = (props) => {
  const { open, review, onClose, onApprove, onReject } = props;
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [productStatus, setProductStatus] = useState('Accepted');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setAction(null);
    setComments('');
    setProductStatus('Accepted');
    setRejectionReason('');
    onClose();
  };

  const handleApprove = async () => {
    if (!review) return;
    
    setIsSubmitting(true);
    try {
      await onApprove(review, comments, productStatus);
      handleClose();
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!review) return;
    
    setIsSubmitting(true);
    try {
      await onReject(review, comments, rejectionReason);
      handleClose();
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!review) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ReviewIcon />
          <Box>
            <Typography variant="h6">
              Review Approval
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {review.product_name || `Product #${review.product_id}`}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Review Information */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Review Information
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Review ID</Typography>
              <Typography variant="body2">#{review.id}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Current Status</Typography>
              <Chip 
                label={review.review_status} 
                size="small" 
                color={getStatusColor(review.review_status) as any}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Product Status</Typography>
              <Chip 
                label={review.product_status} 
                size="small" 
                color="info"
                variant="outlined"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Created</Typography>
              <Typography variant="body2">
                {format(parseISO(review.created_at), 'MMM d, yyyy h:mm a')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Last Updated</Typography>
              <Typography variant="body2">
                {format(parseISO(review.updated_at), 'MMM d, yyyy h:mm a')}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Action Selection */}
        {!action && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Choose Action
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => setAction('approve')}
                size="large"
                sx={{ flex: 1 }}
              >
                Approve Review
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => setAction('reject')}
                size="large"
                sx={{ flex: 1 }}
              >
                Reject Review
              </Button>
            </Box>
          </Box>
        )}

        {/* Approval Form */}
        {action === 'approve' && (
          <Box>
            <Typography variant="h6" color="success.main" gutterBottom>
              Approve Review
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Product Status After Approval</InputLabel>
              <Select
                value={productStatus}
                onChange={(e) => setProductStatus(e.target.value)}
                label="Product Status After Approval"
              >
                <MenuItem value="Accepted">Accepted</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Published">Published</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Approval Comments (Optional)"
              multiline
              rows={3}
              fullWidth
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments about this approval..."
              sx={{ mb: 2 }}
            />

            <Alert severity="success" sx={{ mb: 2 }}>
              Approving this review will mark it as approved and update the product status to "{productStatus}".
            </Alert>
          </Box>
        )}

        {/* Rejection Form */}
        {action === 'reject' && (
          <Box>
            <Typography variant="h6" color="error.main" gutterBottom>
              Reject Review
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Rejection Reason</InputLabel>
              <Select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                label="Rejection Reason"
                required
              >
                <MenuItem value="">Select a reason...</MenuItem>
                <MenuItem value="Incomplete Information">Incomplete Information</MenuItem>
                <MenuItem value="Quality Issues">Quality Issues</MenuItem>
                <MenuItem value="Incorrect Classification">Incorrect Classification</MenuItem>
                <MenuItem value="Missing Requirements">Missing Requirements</MenuItem>
                <MenuItem value="Technical Issues">Technical Issues</MenuItem>
                <MenuItem value="Policy Violation">Policy Violation</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Additional Comments"
              multiline
              rows={4}
              fullWidth
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Provide specific feedback to help the reviewer improve..."
              required
              sx={{ mb: 2 }}
            />

            <Alert severity="warning" sx={{ mb: 2 }}>
              Rejecting this review will send it back to the reviewer with your feedback for revision.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          {action ? 'Back' : 'Cancel'}
        </Button>
        
        {action === 'approve' && (
          <Button
            onClick={handleApprove}
            variant="contained"
            color="success"
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <ApproveIcon />}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Approving...' : 'Confirm Approval'}
          </Button>
        )}
        
        {action === 'reject' && (
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <RejectIcon />}
            disabled={isSubmitting || !rejectionReason || !comments}
          >
            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ReviewApprovalDialog;