# Curva Mestra Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the Curva Mestra platform to production using Firebase services.

## Prerequisites

1. **Firebase CLI**: Install the Firebase CLI globally
   ```bash
   npm install -g firebase-tools
   ```

2. **Node.js**: Ensure Node.js 18+ is installed

3. **Firebase Project**: Access to the `curva-mestra` Firebase project

4. **Authentication**: Login to Firebase CLI
   ```bash
   firebase login
   ```

## Production Deployment

### Automated Deployment

Use the provided deployment scripts for automated deployment:

**Linux/macOS:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\deploy.ps1
```

### Manual Deployment Steps

1. **Set Firebase Project**
   ```bash
   firebase use curva-mestra
   ```

2. **Build Applications**
   ```bash
   # Build all applications
   npm run build
   
   # Or build individually
   npm run build:functions
   npm run build:client
   npm run build:admin
   ```

3. **Deploy Services**
   ```bash
   # Deploy all services
   firebase deploy
   
   # Or deploy individually
   firebase deploy --only firestore
   firebase deploy --only functions
   firebase deploy --only hosting:client
   firebase deploy --only hosting:admin
   firebase deploy --only storage
   ```

## Custom Domain Configuration

### Setting up curvamestra.com.br

1. **Add Custom Domain in Firebase Console**
   - Go to Firebase Console > Hosting
   - Click "Add custom domain"
   - Enter `curvamestra.com.br`
   - Follow verification steps

2. **DNS Configuration**
   Add the following DNS records to your domain provider:

   ```
   Type: A
   Name: @
   Value: [Firebase IP addresses provided in console]
   
   Type: A
   Name: www
   Value: [Firebase IP addresses provided in console]
   
   Type: TXT
   Name: @
   Value: [Verification token from Firebase]
   ```

3. **SSL Certificate**
   Firebase automatically provisions SSL certificates for custom domains.

### Admin Subdomain Configuration

For admin access, configure a subdomain:

```
Type: CNAME
Name: admin
Value: curva-mestra-admin.web.app
```

## Environment Configuration

### Production Environment Variables

Update the following files with production values:

**Client (.env.production):**
- `REACT_APP_FIREBASE_API_KEY`: Production Firebase API key
- `REACT_APP_FIREBASE_AUTH_DOMAIN`: curva-mestra.firebaseapp.com
- `REACT_APP_FIREBASE_PROJECT_ID`: curva-mestra
- `REACT_APP_API_BASE_URL`: Production Functions URL

**Admin (.env.production):**
- Same Firebase configuration as client
- Additional admin-specific settings

### Firebase Configuration

Ensure the following Firebase services are enabled:
- Authentication (Email/Password provider)
- Firestore Database
- Realtime Database
- Cloud Functions
- Cloud Storage
- Hosting
- Performance Monitoring
- Crashlytics

## Security Configuration

### Firestore Security Rules

The deployment includes comprehensive security rules:
- Multi-tenant data isolation
- Role-based access control
- Input validation
- Rate limiting

### Hosting Security Headers

Security headers are automatically applied:
- `Strict-Transport-Security`: HTTPS enforcement
- `X-Content-Type-Options`: MIME type sniffing protection
- `X-Frame-Options`: Clickjacking protection
- `X-XSS-Protection`: XSS attack protection
- `Referrer-Policy`: Referrer information control

## Monitoring and Logging

### Firebase Console Monitoring

Monitor deployment health through:
- Firebase Console Dashboard
- Functions logs and metrics
- Hosting analytics
- Performance monitoring data

### Custom Monitoring

The platform includes:
- Application performance monitoring
- Error tracking with Crashlytics
- Custom business metrics
- Audit logging system

## Rollback Procedures

### Quick Rollback

If issues are detected after deployment:

1. **Revert to Previous Version**
   ```bash
   firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID TARGET_SITE_ID
   ```

2. **Rollback Functions**
   ```bash
   # Deploy previous version from git
   git checkout [previous-commit]
   firebase deploy --only functions
   ```

### Database Rollback

Firestore doesn't support automatic rollbacks. Use:
- Firestore export/import for data recovery
- Backup restoration procedures
- Manual data correction scripts

## Troubleshooting

### Common Deployment Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Clear node_modules and reinstall dependencies
   - Verify environment variables

2. **Function Deployment Errors**
   - Check function timeout settings
   - Verify IAM permissions
   - Review function logs for errors

3. **Hosting Issues**
   - Verify build output directory
   - Check routing configuration
   - Validate custom domain DNS settings

### Performance Optimization

1. **Bundle Size Optimization**
   - Enable code splitting
   - Implement lazy loading
   - Optimize asset compression

2. **Function Performance**
   - Monitor cold start times
   - Optimize function memory allocation
   - Implement connection pooling

## Maintenance

### Regular Tasks

1. **Security Updates**
   - Update dependencies monthly
   - Review security rules quarterly
   - Monitor security advisories

2. **Performance Monitoring**
   - Review performance metrics weekly
   - Optimize slow queries
   - Monitor error rates

3. **Backup Procedures**
   - Daily Firestore exports
   - Weekly full system backups
   - Test restoration procedures monthly

## Support

For deployment issues:
- Check Firebase Console logs
- Review function execution logs
- Contact Firebase support for infrastructure issues
- Refer to project documentation for application-specific issues