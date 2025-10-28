import { useEffect } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';
import { trackEvent } from '../../services/monitoring';

// Web Vitals monitoring component for admin interface
const WebVitalsMonitor: React.FC = () => {
  useEffect(() => {
    // Only track Web Vitals in production
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    const sendToAnalytics = (metric: Metric) => {
      trackEvent('admin_web_vitals', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_id: metric.id,
        metric_delta: metric.delta,
        metric_rating: getMetricRating(metric.name, metric.value),
        app_type: 'admin'
      });
    };

    // Track Core Web Vitals for admin interface
    getCLS(sendToAnalytics);
    getFID(sendToAnalytics);
    getFCP(sendToAnalytics);
    getLCP(sendToAnalytics);
    getTTFB(sendToAnalytics);
  }, []);

  return null; // This component doesn't render anything
};

// Helper function to rate metrics based on Google's thresholds
const getMetricRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds: Record<string, { good: number; poor: number }> = {
    CLS: { good: 0.1, poor: 0.25 },
    FID: { good: 100, poor: 300 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 }
  };

  const threshold = thresholds[name];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
};

export default WebVitalsMonitor;