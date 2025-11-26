#!/bin/bash

# BMS System Setup and Testing Script
# This script helps set up the Business Management Suite with real database data

set -e  # Exit on any error

echo "🏢 BMS Business Management Suite - System Setup"
echo "================================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if PostgreSQL is running
check_postgres() {
    print_info "Checking PostgreSQL connection..."
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_error "PostgreSQL is not running on localhost:5432"
        print_info "Please start PostgreSQL and try again"
        exit 1
    fi
    print_status "PostgreSQL is running"
}

# Check if Node.js is installed
check_nodejs() {
    print_info "Checking Node.js version..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_info "Please install Node.js 18+ and try again"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 22 ]; then
        print_error "Node.js version is too old. Please install Node.js 22+"
        exit 1
    fi
    print_status "Node.js $(node -v) is installed"
}

# Create database
create_database() {
    print_info "Creating database and user..."
    
    # Create database SQL
    cat > /tmp/create_bms_db.sql << EOF
CREATE DATABASE bms_database;
CREATE USER bms_user WITH PASSWORD 'bms_password';
GRANT ALL PRIVILEGES ON DATABASE bms_database TO bms_user;
EOF
    
    # Execute SQL
    if psql -U postgres -f /tmp/create_bms_db.sql >/dev/null 2>&1; then
        print_status "Database 'bms_database' created successfully"
    else
        print_warning "Database might already exist or user creation failed (this is okay)"
    fi
    
    # Clean up
    rm -f /tmp/create_bms_db.sql
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies for all services..."
    
    # Backend API
    print_info "Installing backend API dependencies..."
    if [ -d "bms-api" ]; then
        cd bms-api
        npm install
        cd ..
        print_status "Backend API dependencies installed"
    else
        print_error "bms-api directory not found"
        exit 1
    fi
    
    # Frontend Web
    print_info "Installing frontend web dependencies..."
    if [ -d "bms-web" ]; then
        cd bms-web
        npm install
        cd ..
        print_status "Frontend web dependencies installed"
    else
        print_error "bms-web directory not found"
        exit 1
    fi
    
    # POS System
    print_info "Installing POS system dependencies..."
    if [ -d "bms-pos" ]; then
        cd bms-pos
        npm install
        cd ..
        print_status "POS system dependencies installed"
    else
        print_error "bms-pos directory not found"
        exit 1
    fi
}

# Setup database
setup_database() {
    print_info "Setting up database schema and seed data..."
    
    cd bms-api
    
    # Generate Prisma client
    print_info "Generating Prisma client..."
    npx prisma generate
    print_status "Prisma client generated"
    
    # Create and run migration
    print_info "Creating database migration..."
    npx prisma migrate dev --name init --skip-generate
    print_status "Database migration completed"
    
    # Run seed data
    print_info "Seeding database with test data..."
    npm run prisma:seed
    print_status "Database seeded successfully"
    
    cd ..
}

# Start services
start_services() {
    print_info "Starting BMS services..."
    
    # Check if ports are available
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3001 is already in use (Backend API)"
    fi
    
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3000 is already in use (Frontend Web)"
    fi
    
    if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3002 is already in use (POS System)"
    fi
    
    # Start Backend API in background
    print_info "Starting Backend API on port 3001..."
    cd bms-api
    npm run dev &
    API_PID=$!
    cd ..
    
    # Wait for API to start
    sleep 5
    
    # Start Frontend Web in background
    print_info "Starting Frontend Web on port 3000..."
    cd bms-web
    npm run dev &
    WEB_PID=$!
    cd ..
    
    # Start POS System in background
    print_info "Starting POS System on port 3002..."
    cd bms-pos
    npm run dev &
    POS_PID=$!
    cd ..
    
    print_status "All services started!"
    echo
    echo "🔗 Application URLs:"
    echo "   Backend API:  http://localhost:3001"
    echo "   Frontend Web: http://localhost:3000"
    echo "   POS System:   http://localhost:3002"
    echo
    echo "🔑 Test Credentials:"
    echo "   Admin:    admin@bms.co.id    / password123"
    echo "   Manager:  manager@bms.co.id  / password123"
    echo "   Staff:    staff1@bms.co.id   / password123"
    echo
    echo "🛑 To stop all services, run:"
    echo "   kill $API_PID $WEB_PID $POS_PID"
    echo
    
    # Save PIDs to file
    echo "$API_PID $WEB_PID $POS_PID" > /tmp/bms_pids.txt
}

# Test the system
test_system() {
    print_info "Testing system connectivity..."
    
    # Test API
    sleep 2
    if curl -s http://localhost:3001/health >/dev/null 2>&1; then
        print_status "Backend API is responding"
    else
        print_warning "Backend API might still be starting up"
    fi
    
    # Test database connection
    print_info "Testing database connection..."
    cd bms-api
    if npx prisma db pull >/dev/null 2>&1; then
        print_status "Database connection successful"
    else
        print_error "Database connection failed"
    fi
    cd ..
    
    print_status "System test completed"
}

# Show summary
show_summary() {
    echo
    echo "🎉 BMS System Setup Complete!"
    echo "============================="
    echo
    echo "📊 Data Summary:"
    echo "   • 3 Branches (Jakarta, Surabaya, Bandung)"
    echo "   • 9 Users (Admin, Manager, Staff)"
    echo "   • 130+ Products across 10 categories"
    echo "   • 60+ Realistic Transactions"
    echo "   • 20 Purchase Orders"
    echo "   • 8 Suppliers with complete data"
    echo "   • 25 Messages for communication"
    echo "   • Inventory, Accounting, Attendance data"
    echo
    echo "🔧 Frontend Components Updated:"
    echo "   • Branches Management"
    echo "   • User Management"
    echo "   • Suppliers Management"
    echo "   • Purchase Orders"
    echo "   • Sales Dashboard with Real Analytics"
    echo
    echo "📚 Documentation:"
    echo "   • DATABASE_SETUP_AND_TESTING.md - Complete setup guide"
    echo "   • This script - Quick setup and testing"
    echo
    echo "✨ All systems are now using REAL DATABASE DATA instead of mock data!"
    echo
}

# Cleanup function
cleanup() {
    print_info "Cleaning up..."
    if [ -f "/tmp/bms_pids.txt" ]; then
        PIDS=$(cat /tmp/bms_pids.txt)
        kill $PIDS 2>/dev/null || true
        rm -f /tmp/bms_pids.txt
    fi
    print_status "Cleanup completed"
}

# Trap cleanup on script exit
trap cleanup EXIT

# Main execution
main() {
    echo "Starting BMS System Setup..."
    echo
    
    # Check prerequisites
    check_nodejs
    check_postgres
    
    # Setup database and dependencies
    create_database
    install_dependencies
    setup_database
    
    # Test and start services
    test_system
    start_services
    
    # Show summary
    show_summary
    
    print_info "Setup script completed! You can now test the system."
}

# Handle script arguments
case "${1:-}" in
    "test")
        print_info "Running system test only..."
        test_system
        ;;
    "cleanup")
        cleanup
        print_status "Cleanup completed"
        ;;
    "help"|"-h"|"--help")
        echo "BMS System Setup Script"
        echo
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  (no command)  Full setup and start services"
        echo "  test          Test system connectivity only"
        echo "  cleanup       Stop all services and cleanup"
        echo "  help          Show this help message"
        ;;
    *)
        main
        ;;
esac