#!/usr/bin/env python3
"""
Setup script for CrowdCare FastAPI backend.
"""
import os
import subprocess
import sys
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"Running: {description}")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✓ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("✗ Python 3.8 or higher is required")
        return False
    print(f"✓ Python {version.major}.{version.minor}.{version.micro} is compatible")
    return True

def install_dependencies():
    """Install Python dependencies."""
    return run_command("pip install -r requirements.txt", "Installing Python dependencies")

def setup_environment():
    """Set up environment file."""
    env_file = Path(".env")
    env_example = Path("env.example")
    
    if not env_file.exists() and env_example.exists():
        print("Creating .env file from template...")
        with open(env_example, 'r') as f:
            content = f.read()
        with open(env_file, 'w') as f:
            f.write(content)
        print("✓ .env file created. Please edit it with your configuration.")
        return True
    elif env_file.exists():
        print("✓ .env file already exists")
        return True
    else:
        print("✗ env.example file not found")
        return False

def setup_database():
    """Set up database migrations."""
    return run_command("alembic upgrade head", "Setting up database schema")

def create_minio_bucket():
    """Create MinIO bucket if using MinIO."""
    # This would require MinIO client setup
    print("ℹ MinIO bucket creation skipped. Please create the bucket manually if using MinIO.")
    return True

def main():
    """Main setup function."""
    print("CrowdCare FastAPI Backend Setup")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        print("Failed to install dependencies. Please check the error messages above.")
        sys.exit(1)
    
    # Setup environment
    if not setup_environment():
        print("Failed to setup environment file.")
        sys.exit(1)
    
    # Setup database (optional - requires database to be running)
    print("\nDatabase setup (optional - requires PostgreSQL to be running):")
    setup_database()
    
    # MinIO bucket setup
    create_minio_bucket()
    
    print("\n" + "=" * 40)
    print("Setup completed!")
    print("\nNext steps:")
    print("1. Edit .env file with your configuration")
    print("2. Start PostgreSQL with PostGIS extension")
    print("3. Run 'python run.py' to start the development server")
    print("4. Or use 'docker-compose up' for full stack deployment")

if __name__ == "__main__":
    main()
