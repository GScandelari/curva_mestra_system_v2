# Curva Mestra Monitoring and Analytics Guide

## Overview

The Curva Mestra platform includes comprehensive monitoring and analytics capabilities to ensure system reliability, performance optimization, and business insights. This document outlines the monitoring architecture, available metrics, and how to use the monitoring features.

## Monitoring Architecture

### Frontend Monitoring

**Firebase Performance Monitoring**
- Automatic performance tracking for web applications
- Core Web Vitals monitoring (CLS, FID, FCP, LCP, TTFB)
- Custom trace creation for critical operations
- Real-time performance data collection

**Firebase Analytics**
- User behavior tracking
- Business event monitoring
- Custom event logging
- User segmentation and properties

**Web Vitals Integration**
- Automatic Core Web Vitals collection
- Performance threshold monitoring
- User experience optimization metrics

### Backend Monitoring

**Function Performance Monitoring**
- Execution time tracking
- Success/failure rate monitoring
- Custom function metrics
- Error tracking and reporting

**API Monitoring**
- Response time measurement
- Error rate tracking
- Endpoint usage analytics
- Request volume monitoring

**Database Monitoring**
- Query performance tracking
- Connection monitoring
- Data integrity checks

## Available Metrics

### System Health Metrics

1. **Overall System Status**
   - Health status indicator (Healthy/Warning/Error)
   - System availability percentage
   - Service status overview

2. **Performance Metrics**
   - Average API response time
   - Database query performance
   - Function execution times
   - Error rates across services

3. **Business Metrics**
   - Total clinics count
   - Total users count
   - Total products (approved/pending)
   - Active treatment requests
   - System usage statistics

### User Analytics

1. **Authentication Events**
   - Login/logout tracking
   - Authentication method usage
   - Session duration monitoring
   - Failed login attempts

2. **User Behavior**
   - Page view tracking
   - Feature usage analytics
   - Navigation patterns
   - User engagement metrics

3. **Business Actions**
   - Invoice creation tracking
   - Patient registration events
   - Treatment request monitoring
   - Inventory management actions

### Performance Analytics

1. **Web Performance**
   - Core Web Vitals (CLS, FID, FCP, LCP, TTFB)
   - Page load times
   - Resource loading performance
   - Network performance metrics

2. **API Performance**
   - Endpoint response times
   - Request success rates
   - Error distribution
   - Traffic patterns

3. **Function Performance**
   - Cold start times
   - Execution duration
   - Memory usage
   - Invocation frequency

## Monitoring Dashboard

### Admin Monitoring Dashboard

The system admin dashboard provides comprehensive monitoring capabilities:

**System Overview**
- Real-time system health status
- Key performance indicators
- Alert notifications
- System statistics summary

**Performance Metrics**
- Response time trends
- Error rate monitoring
- Request volume analytics
- Performance threshold alerts

**Error Tracking**
- Recent error logs
- Error frequency analysis
- Error categorization
- Error resolution tracking

**Business Analytics**
- User activity metrics
- Feature usage statistics
- Business process monitoring
- Growth and usage trends

### Accessing the Monitoring Dashboard

1. **System Admin Access**
   - Login to admin dashboard
   - Navigate to "System Monitoring" section
   - View real-time metrics and alerts
   - Access detailed analytics reports

2. **Monitoring Tabs**
   - **Performance Metrics**: Response times, error rates, request volumes
   - **Error Logs**: Recent errors, error patterns, resolution status
   - **API Analytics**: Endpoint usage, performance trends, traffic analysis

## Alert System

### Automatic Alerts

The system automatically generates alerts for:

1. **Performance Issues**
   - High response times (>2000ms)
   - High error rates (>5%)
   - System downtime
   - Resource exhaustion

2. **Business Alerts**
   - Pending product approvals
   - Low inventory warnings
   - Expiring products
   - Failed critical operations

3. **Security Alerts**
   - Multiple failed login attempts
   - Suspicious activity patterns
   - Unauthorized access attempts
   - Data integrity issues

### Alert Configuration

Alerts can be configured through:
- Environment variables for thresholds
- Firebase Console for service alerts
- Custom alert rules in monitoring service

## Custom Event Tracking

### Frontend Event Tracking

```typescript
import { trackBusinessMetrics } from '../services/monitoring';

// Track business events
trackBusinessMetrics.invoiceCreated(clinicId, productCount, totalValue);
trackBusinessMetrics.patientRegistered(clinicId);
trackBusinessMetrics.requestCreated(clinicId, productCount);

// Track user interactions
trackBusinessMetrics.dashboardViewed(clinicId);
trackBusinessMetrics.inventoryViewed(clinicId);
```

### Backend Event Tracking

```typescript
import FunctionMonitoring from '../services/monitoringService';

const monitoring = FunctionMonitoring.getInstance();

// Track business events
await monitoring.trackBusinessEvent('invoice_approved', {
  invoice_id: invoiceId,
  clinic_id: clinicId,
  total_value: totalValue
});

// Track errors
await monitoring.trackError(error, 'invoice_processing', userId, clinicId);
```

## Performance Optimization

### Monitoring-Based Optimization

1. **Identify Bottlenecks**
   - Use performance metrics to identify slow operations
   - Monitor database query performance
   - Track function execution times

2. **Optimize Based on Data**
   - Implement caching for frequently accessed data
   - Optimize database queries based on performance metrics
   - Improve function performance using execution data

3. **Monitor Improvements**
   - Track performance improvements over time
   - Validate optimization effectiveness
   - Continuous performance monitoring

### Best Practices

1. **Monitoring Implementation**
   - Use sampling for high-volume events
   - Implement proper error handling in monitoring code
   - Avoid blocking operations in monitoring calls

2. **Data Privacy**
   - Anonymize sensitive data in analytics
   - Comply with data protection regulations
   - Implement proper data retention policies

3. **Performance Impact**
   - Minimize monitoring overhead
   - Use asynchronous tracking where possible
   - Implement proper rate limiting

## Troubleshooting

### Common Monitoring Issues

1. **Missing Analytics Data**
   - Verify Firebase configuration
   - Check environment variables
   - Validate analytics initialization

2. **Performance Monitoring Not Working**
   - Ensure production environment
   - Verify Firebase Performance SDK
   - Check browser compatibility

3. **High Error Rates**
   - Review error logs in monitoring dashboard
   - Check system health metrics
   - Investigate recent deployments

### Debugging Steps

1. **Check Configuration**
   - Verify Firebase project settings
   - Validate environment variables
   - Confirm service initialization

2. **Review Logs**
   - Check Firebase Console logs
   - Review function execution logs
   - Analyze error patterns

3. **Test Monitoring**
   - Trigger test events
   - Verify data collection
   - Validate dashboard updates

## Security and Privacy

### Data Protection

1. **Sensitive Data Handling**
   - No PII in analytics events
   - Anonymized user identifiers
   - Encrypted data transmission

2. **Access Control**
   - Role-based monitoring access
   - Secure API endpoints
   - Audit trail for monitoring access

3. **Compliance**
   - LGPD compliance for Brazilian data
   - Data retention policies
   - User consent management

### Security Monitoring

1. **Authentication Monitoring**
   - Failed login tracking
   - Suspicious activity detection
   - Session management monitoring

2. **Access Pattern Analysis**
   - Unusual access patterns
   - Privilege escalation attempts
   - Data access monitoring

## Maintenance and Updates

### Regular Maintenance

1. **Data Cleanup**
   - Archive old monitoring data
   - Clean up expired metrics
   - Optimize storage usage

2. **Performance Review**
   - Monthly performance analysis
   - Quarterly optimization review
   - Annual monitoring strategy review

3. **Alert Tuning**
   - Adjust alert thresholds
   - Reduce false positives
   - Improve alert accuracy

### Monitoring Updates

1. **SDK Updates**
   - Keep Firebase SDKs updated
   - Update monitoring libraries
   - Test new monitoring features

2. **Configuration Updates**
   - Update monitoring rules
   - Adjust sampling rates
   - Optimize data collection

## Support and Resources

### Documentation
- Firebase Performance Monitoring: https://firebase.google.com/docs/perf-mon
- Firebase Analytics: https://firebase.google.com/docs/analytics
- Web Vitals: https://web.dev/vitals/

### Monitoring Tools
- Firebase Console: https://console.firebase.google.com
- Google Analytics: https://analytics.google.com
- Cloud Monitoring: https://cloud.google.com/monitoring

### Contact Information
- Technical Support: support@curvamestra.com.br
- System Admin: admin@curvamestra.com.br
- Emergency Contact: emergency@curvamestra.com.br