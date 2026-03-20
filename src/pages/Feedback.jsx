import { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Star, Package, CheckCircle, Truck, MessageSquare, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

export default function Feedback() {
  const urlParams = new URLSearchParams(window.location.search);
  const shipmentId = urlParams.get('shipment');
  const journeyId = urlParams.get('journey');
  const shoppingOrderId = urlParams.get('shopping_order');

  const [ratings, setRatings] = useState({
    overall: 0,
    service: 0,
    delivery: 0,
    communication: 0,
  });
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const { data: shipment } = useQuery({
    queryKey: ['shipment-feedback', shipmentId, journeyId, shoppingOrderId],
    queryFn: async () => {
      if (shipmentId) {
        const shipments = await db.shipments.filter({ id: shipmentId });
        return shipments[0] || null;
      }

      if (journeyId) {
        const shipments = await db.shipments.filter({ journey_id: journeyId });
        return shipments[0] || null;
      }

      if (shoppingOrderId) {
        const shipments = await db.shipments.filter({ shopping_order_id: shoppingOrderId });
        return shipments[0] || null;
      }

      return null;
    },
    enabled: !!(shipmentId || journeyId || shoppingOrderId),
  });

  const { data: existingFeedback } = useQuery({
    queryKey: ['feedback', shipmentId, journeyId, shoppingOrderId],
    queryFn: async () => {
      if (shipmentId) {
        const feedbacks = await db.feedback.filter({ shipment_id: shipmentId });
        return feedbacks[0] || null;
      }

      if (journeyId) {
        const feedbacks = await db.feedback.filter({ journey_id: journeyId });
        return feedbacks[0] || null;
      }

      if (shoppingOrderId) {
        const feedbacks = await db.feedback.filter({ order_reference_id: shoppingOrderId });
        return feedbacks[0] || null;
      }

      return null;
    },
    enabled: !!(shipmentId || journeyId || shoppingOrderId),
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      if (existingFeedback) {
        return db.feedback.update(existingFeedback.id, data);
      }
      return db.feedback.create(data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
    },
  });

  const handleSubmit = () => {
    if (ratings.overall === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    submitMutation.mutate({
      shipment_id: shipmentId || shipment?.id || null,
      journey_id: journeyId || shipment?.journey_id || null,
      shopping_order_id: shoppingOrderId || shipment?.shopping_order_id || null,
      customer_name: shipment?.customer_name || 'Customer',
      rating: ratings.overall,
      service_rating: ratings.service,
      delivery_rating: ratings.delivery,
      communication_rating: ratings.communication,
      comment,
      service_type: shipment?.service_type,
      would_recommend: wouldRecommend,
      order_reference_type:
        shoppingOrderId || shipment?.shopping_order_id
          ? 'shopping_order'
          : journeyId || shipment?.journey_id
            ? 'journey'
            : 'shipment',
      order_reference_id:
        shoppingOrderId ||
        shipment?.shopping_order_id ||
        journeyId ||
        shipment?.journey_id ||
        shipmentId,
      status: 'submitted',
    });
  };

  if (!shipmentId && !journeyId && !shoppingOrderId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Shipment Found</h2>
            <p className="text-slate-500">
              Please use the link from your email to submit feedback.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted || existingFeedback?.status === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
            <p className="text-slate-500 mb-6">Your feedback helps us improve our service.</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 ${star <= (ratings.overall || existingFeedback?.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-4">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-slate-900">
              {shipment?.tracking_number || 'Shipment'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            How was your experience?
          </h1>
          <p className="text-slate-500 mt-2">Your feedback helps us serve you better</p>
        </div>

        {/* Overall Rating */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <Label className="text-lg font-medium text-slate-900 mb-4 block">
              Overall Experience
            </Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatings({ ...ratings, overall: star })}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${star <= ratings.overall ? 'text-amber-400 fill-amber-400' : 'text-slate-200 hover:text-amber-200'}`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500 mt-2">
              {ratings.overall === 0
                ? 'Tap to rate'
                : ratings.overall <= 2
                  ? "We're sorry to hear that"
                  : ratings.overall === 3
                    ? 'Thanks for the feedback'
                    : ratings.overall === 4
                      ? 'Great!'
                      : 'Excellent!'}
            </p>
          </CardContent>
        </Card>

        {/* Detailed Ratings */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Rate specific areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RatingRow
              icon={<Package className="w-5 h-5" />}
              label="Service Quality"
              value={ratings.service}
              onChange={(v) => setRatings({ ...ratings, service: v })}
            />
            <RatingRow
              icon={<Truck className="w-5 h-5" />}
              label="Delivery Speed"
              value={ratings.delivery}
              onChange={(v) => setRatings({ ...ratings, delivery: v })}
            />
            <RatingRow
              icon={<MessageSquare className="w-5 h-5" />}
              label="Communication"
              value={ratings.communication}
              onChange={(v) => setRatings({ ...ratings, communication: v })}
            />
          </CardContent>
        </Card>

        {/* Comment & Recommend */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="mb-2 block">Additional Comments (Optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more about your experience..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <ThumbsUp className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Would you recommend us?</span>
              </div>
              <Switch checked={wouldRecommend} onCheckedChange={setWouldRecommend} />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
        >
          {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </div>
    </div>
  );
}

function RatingRow({ icon, label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-slate-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} onClick={() => onChange(star)} className="p-0.5">
            <Star
              className={`w-5 h-5 ${star <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
