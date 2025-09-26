# Material Allocator App

A React-based material allocation management system for tracking project resources, inventory, and automated allocation workflows.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher
- **Web Server**: Nginx, Apache, WAMP, XAMPP, or any static file server

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd material-allocator

# Install dependencies
npm install

# Start development server
npm run dev
```

The development server will run on `http://localhost:8080`

## 🏗️ Building the Application

### Build Commands

```bash
# Development build (base URL: "/")
npm run build

# Production build (base URL: "/")
npm run build:prod

# Pre-production build (base URL: "/material-allocator/")
npm run build:preprod
```

### Build Outputs

After building, the `dist/` folder contains:
```
dist/
├── index.html          # Main HTML file
├── assets/            # CSS, JS, and other assets
│   ├── index-[hash].css
│   ├── index-[hash].js
│   └── ...
└── npc.png           # Static assets
```

## 🌐 Deployment Guide

### Static File Servers

The built application is a static React SPA that requires a web server to serve files and handle routing.

#### Nginx Configuration

Create or update your Nginx server block:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # Handle React Router (client-side routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
}
```

#### Apache Configuration

Create or update `.htaccess` in your document root:

```apache
RewriteEngine On

# Handle React Router
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Cache static assets
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
</FilesMatch>

# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
```

#### WAMP/XAMPP Setup

1. **Copy files**: Place the contents of `dist/` folder into your web server's document root:
   - WAMP: `C:\wamp64\www\material-allocator\`
   - XAMPP: `C:\xampp\htdocs\material-allocator\`

2. **Enable mod_rewrite** (Apache):
   - Edit `httpd.conf`
   - Uncomment: `LoadModule rewrite_module modules/mod_rewrite.so`
   - Restart server

3. **Access**: `http://localhost/material-allocator/`

### Base URL Configuration

The application supports different base URLs for various deployment scenarios:

#### Root Domain Deployment (`/`)
Use `.env.production`:
```env
VITE_BASE_URL="/"
```
Access: `https://yourdomain.com/`

#### Subdirectory Deployment (`/subfolder/`)
Create custom `.env` file:
```env
VITE_BASE_URL="/material-allocator/"
```
Access: `https://yourdomain.com/material-allocator/`

#### Build for Specific Path
```bash
# Set custom base URL and build
echo 'VITE_BASE_URL="/your-path/"' > .env.local
npm run build
```

## 🚀 Automated Deployment

### GitHub Actions (Current Setup)

The repository includes automated deployment to BunnyCDN:

1. **Trigger**: Push to `release` branch
2. **Process**:
   - Builds using `npm run build:preprod`
   - Rewrites asset URLs to `/npc/material-allocator/`
   - Deploys to BunnyCDN storage

### Manual Release Process

1. **Create a release build**:
   ```bash
   npm run build:prod
   ```

2. **Create release tag**:
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

3. **Package for distribution**:
   ```bash
   tar -czf material-allocator-v1.0.0.tar.gz dist/
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_BASE_URL` | Base URL for routing and assets | `"/"` |

### Router Configuration

The app uses React Router's `BrowserRouter` with:
- **Base URL**: Configured via `VITE_BASE_URL`
- **Routing Mode**: HTML5 History API
- **Fallback**: All unknown routes redirect to `/dashboard`

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Redirect to `/dashboard` | Root redirect |
| `/dashboard` | Dashboard | Main overview |
| `/projects` | Projects | Project listing |
| `/projects/:id` | ProjectDetail | Project details |
| `/inventory` | Inventory | Inventory management |
| `*` | NotFound | 404 page |

## 🔍 Troubleshooting

### Common Issues

#### 1. **Blank page after deployment**
- **Cause**: Incorrect base URL configuration
- **Solution**: Check `VITE_BASE_URL` matches your deployment path

#### 2. **404 on page refresh**
- **Cause**: Web server not configured for SPA routing
- **Solution**: Configure server to serve `index.html` for all routes

#### 3. **Assets not loading**
- **Cause**: Asset paths don't match deployment structure
- **Solution**: Verify base URL and check network tab for 404s

#### 4. **CORS errors in production**
- **Cause**: API calls from wrong origin
- **Solution**: Configure your API server to allow your domain

### Debug Mode

Enable development debugging:
```bash
# Run with debug info
npm run dev -- --debug

# Check build output
npm run build -- --debug
```

### Logs and Monitoring

Check browser developer tools:
- **Console**: JavaScript errors and warnings
- **Network**: Failed asset loads or API calls
- **Application**: LocalStorage data and service worker status

## 📁 Project Structure

```
material-allocator/
├── src/
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Utility functions
│   ├── storage/           # Local storage management
│   └── domain/            # Type definitions
├── public/                # Static assets
├── dist/                  # Build output (generated)
├── scripts/              # Build scripts
└── .env*                 # Environment configurations
```

## 🛠️ Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **Routing**: React Router v6
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: React Query, Local Storage
- **File Processing**: XLSX parsing
- **Deployment**: GitHub Actions, BunnyCDN

## 📄 License

This project is licensed under the MIT License.

## 🤝 Support

For issues and questions:
1. Check this README for common solutions
2. Review browser console for errors
3. Verify web server configuration
4. Check network requests in developer tools

---

**Note**: This application requires a web server that supports HTML5 History API routing. Simple file serving (like `file://` protocol) will not work correctly due to client-side routing requirements.