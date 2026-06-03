#!/bin/bash

# ============================================
# ArcFace Service Build Script cho Ubuntu
# ============================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Config
SERVICE_NAME="arcface-service"
SERVICE_PORT="${PORT:-8000}"
VENV_DIR="venv"
REQUIREMENTS_FILE="requirements.txt"

# Parse arguments
ACTION="${1:-install}"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check OS
check_os() {
    if [[ ! -f /etc/os-release ]]; then
        log_error "Khong the xac dinh OS. Script nay chi ho tro Ubuntu/Debian."
        exit 1
    fi

    . /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
        log_warn "Script nay duoc toi uu hoa cho Ubuntu/Debian. Ban dang su dung: $PRETTY_NAME"
    fi
}

# Check Python version
check_python() {
    log_info "Kiem tra Python..."

    if ! command -v python3 &> /dev/null; then
        log_error "Python3 chua duoc cai dat. Vui long cai dat Python 3.10+"
        exit 1
    fi

    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    REQUIRED_VERSION="3.10"

    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        log_error "Python version can be tren 3.10. Hien tai: Python $PYTHON_VERSION"
        exit 1
    fi

    log_info "Python version: $(python3 --version)"
}

# Install system dependencies
install_system_deps() {
    log_info "Cai dat system dependencies..."

    sudo apt update
    sudo apt install -y \
        python3-pip \
        python3-venv \
        python3-dev \
        build-essential \
        libgl1-mesa-glx \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
        libgomp1 \
        git

    log_info "System dependencies da cai dat thanh cong!"
}

# Create virtual environment and install dependencies
install_dependencies() {
    log_info "Tao virtual environment..."

    if [ -d "$VENV_DIR" ]; then
        log_warn "Virtual environment da ton tai. Xoa va tao moi? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            rm -rf "$VENV_DIR"
        else
            log_info "Su dung virtual environment hien co."
        fi
    fi

    if [ ! -d "$VENV_DIR" ]; then
        python3 -m venv "$VENV_DIR"
        log_info "Virtual environment da tao tai: $VENV_DIR"
    fi

    log_info "Kich hoat virtual environment va cai dat dependencies..."

    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"

    pip install --upgrade pip
    pip install -r "$REQUIREMENTS_FILE"

    deactivate 2>/dev/null || true

    log_info "Dependencies da cai dat thanh cong!"
}

# Verify installation
verify_install() {
    log_info "Xac minh cau hinh..."

    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"

    # Check key packages
    python3 -c "import fastapi; import insightface; import onnxruntime; import cv2" 2>/dev/null

    if [ $? -eq 0 ]; then
        log_info "Tat ca packages da duoc cai dat dung cach!"
    else
        log_error "Co loi khi xac minh packages. Vui long kiem tra lai."
        deactivate 2>/dev/null || true
        exit 1
    fi

    deactivate 2>/dev/null || true
}

# Build/Package service
build() {
    log_info "Dang build service..."

    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"

    # Create dist directory
    mkdir -p dist

    # Copy files
    log_info "Dang dong goi files..."

    # Copy app folder
    cp -r app dist/

    # Copy requirements
    cp requirements.txt dist/

    # Create startup script
    cat > dist/start.sh << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "../venv" ]; then
    echo "Virtual environment khong ton tai. Vui long chay build truoc."
    exit 1
fi

source ../venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
EOF

    chmod +x dist/start.sh

    deactivate 2>/dev/null || true

    log_info "Build hoan tat! Files nam trong thu muc 'dist/'"
}

# Run service
run() {
    log_info "Khoi dong ArcFace service tren port $SERVICE_PORT..."

    if [ ! -d "$VENV_DIR" ]; then
        log_error "Virtual environment chua ton tai. Vui long chay '$0 install' truoc."
        exit 1
    fi

    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"

    PORT="$SERVICE_PORT" python -m uvicorn app.main:app --host 0.0.0.0 --port "$SERVICE_PORT"

    # Note: uvicorn se block terminal
    # Su dung PM2 neu muon chay background
}

# Run with PM2
run_pm2() {
    log_info "Khoi dong ArcFace service voi PM2..."

    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 chua duoc cai dat. Cai dat bang: sudo npm install -g pm2"
        exit 1
    fi

    if [ ! -d "$VENV_DIR" ]; then
        log_error "Virtual environment chua ton tai. Vui long chay '$0 install' truoc."
        exit 1
    fi

    # Stop existing process if running
    pm2 stop "$SERVICE_NAME" 2>/dev/null || true
    pm2 delete "$SERVICE_NAME" 2>/dev/null || true

    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: '-m',
    args: 'uvicorn app.main:app --host 0.0.0.0 --port $SERVICE_PORT',
    interpreter: 'none',
    cwd: '$PWD',
    python_path: '$PWD/$VENV_DIR/bin/python',
    env: {
      PORT: $SERVICE_PORT,
      PYTHONUNBUFFERED: '1'
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

    # Create logs directory
    mkdir -p logs

    # Start with PM2
    pm2 start ecosystem.config.js

    # Save PM2 config
    pm2 save

    log_info "Service da khoi dong voi PM2!"
    log_info "Truy cap API tai: http://localhost:$SERVICE_PORT"
    log_info "Swagger docs tai: http://localhost:$SERVICE_PORT/docs"
}

# Stop PM2
stop_pm2() {
    log_info "Dung ArcFace service..."

    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 chua duoc cai dat."
        exit 1
    fi

    pm2 stop "$SERVICE_NAME" 2>/dev/null || true
    pm2 delete "$SERVICE_NAME" 2>/dev/null || true

    log_info "Service da duoc dung!"
}

# Clean build artifacts
clean() {
    log_info "Don dep build artifacts..."

    rm -rf dist/
    rm -f ecosystem.config.js

    log_info "Don dep hoan tat!"
}

# Full setup - install + run
full_setup() {
    check_os
    check_python
    install_system_deps
    install_dependencies
    verify_install
    build

    log_info "=========================================="
    log_info "Cai dat hoan tat!"
    log_info ""
    log_info "Su dung:"
    log_info "  $0 run        - Chay truc tiep (foreground)"
    log_info "  $0 pm2        - Chay voi PM2 (background)"
    log_info "  $0 stop       - Dung PM2 service"
    log_info "  $0 clean      - Don dep build files"
    log_info "=========================================="
}

# Show help
show_help() {
    echo "ArcFace Service Build Script"
    echo ""
    echo "Su dung: $0 [ACTION]"
    echo ""
    echo "Actions:"
    echo "  install     - Cai dat dependencies (mac dinh)"
    echo "  build       - Build service (dong goi files)"
    echo "  run         - Chay service truc tiep"
    echo "  pm2         - Chay service voi PM2 (background)"
    echo "  stop        - Dung PM2 service"
    echo "  clean       - Don dep build artifacts"
    echo "  full        - Full setup: install + build"
    echo "  help        - Hien thi help nay"
    echo ""
    echo "Vi du:"
    echo "  $0 install            # Cai dat dependencies"
    echo "  $0 full               # Full setup"
    echo "  $0 pm2                # Chay voi PM2"
    echo "  PORT=8001 $0 pm2      # Chay tren port 8001"
}

# Main
case "$ACTION" in
    install)
        check_os
        check_python
        install_dependencies
        verify_install
        ;;
    build)
        if [ ! -d "$VENV_DIR" ]; then
            log_error "Virtual environment chua ton tai. Chay '$0 install' truoc."
            exit 1
        fi
        build
        ;;
    run)
        run
        ;;
    pm2)
        run_pm2
        ;;
    stop)
        stop_pm2
        ;;
    clean)
        clean
        ;;
    full)
        full_setup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown action: $ACTION"
        show_help
        exit 1
        ;;
esac
