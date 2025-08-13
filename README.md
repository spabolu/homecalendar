# 🏠 Home Calendar Dashboard

A modern, responsive calendar dashboard built with Preact and Vite that displays family events from iCal URL with color-coded organization and world clock support.

![Calendar Dashboard](https://img.shields.io/badge/Status-Live-brightgreen) ![Build](https://img.shields.io/badge/Build-Passing-success) ![License](https://img.shields.io/badge/License-MIT-blue)

## 📸 Demo

<p float="left">
  <img src="assets/images/wall-dashboard.jpg" width="45%" />
  <img src="assets/images/dashboard.jpg" width="45%" />
</p>

## ✨ Features

- **📅 Interactive Calendar**: Clean, responsive calendar interface with week/day views
- **🔒 Secure iCal Integration**: Fetches calendar data from private iCal feeds via Cloudflare Worker proxy
- **👥 Multi-User Support**: Color-coded events by family member/organizer
- **🌍 World Clock**: Real-time display of multiple timezones
- **🎨 Modern UI**: Built with Tailwind CSS for a clean, professional look
- **🐳 Docker Ready**: Containerized for easy deployment
- **⚡ Fast**: Powered by Vite for lightning-fast development and builds

## 🛠 Tech Stack

- **Frontend**: [Preact](https://preactjs.com/) - Lightweight React alternative
- **Build Tool**: [Vite](https://vitejs.dev/) - Next-generation frontend tooling
- **Calendar**: [FullCalendar](https://fullcalendar.io/) - Feature-rich calendar component
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **iCal Parsing**: [ICAL.js](https://github.com/mozilla-comm/ical.js/) - Calendar data processing
- **Deployment**: Docker + Cloudflare Workers for backend proxy

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- npm or yarn
- Docker (optional)

### Local Development

1. **Clone the repository:**

   ```bash
   git clone https://github.com/spabolu/homecalendar.git
   cd homecalendar
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your Cloudflare Worker URL, shared secret and family memebers info
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   
   Navigate to `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## 🐳 Docker Deployment

### Build and run locally

```bash
# Build the image
docker build -t homecalendar .

# Run the container
docker run -p 8000:8000 homecalendar
```

The application will be available at `http://localhost:8000`.

### Multi-platform support

The Docker image supports multiple architectures (x86_64, ARM64) for deployment across different environments.

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Cloudflare Worker URL for iCal proxy
VITE_CLOUDFLARE_URL="https://your-worker.your-subdomain.workers.dev/"

# Shared secret for worker authentication
VITE_SHARED_SECRET="your-random-secret-string"

# Family member configuration (JSON array)
VITE_FAMILY_CONFIG='[{"name":"Member 1","color":"#E55555","initials":"M1"}...]'
```

### Cloudflare Worker Setup

The application requires a Cloudflare Worker to securely proxy iCal feeds. See `worker.js` for the implementation.

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Cloudflare      │    │   iCal Feed     │
│   (Preact)      │───▶│   Worker         │───▶│  (Google Cal)   │
│                 │    │   (Proxy)        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

- **Frontend**: Preact app with FullCalendar integration
- **Proxy Layer**: Cloudflare Worker for secure iCal feed access
- **Data Source**: Private Google Calendar or any iCal-compatible service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
