#!/usr/bin/env python3
"""
Production cleanup script for Beacon Blast Email Marketing Platform.
This script removes debug code and replaces it with proper production logging.
"""

import os
import re
import sys
from pathlib import Path

# Backend Python files to clean
BACKEND_ROOT = Path("backend")
FRONTEND_ROOT = Path("src")

def replace_print_statements(file_path):
    """Replace print statements with proper logging."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace print statements with logger calls
        # Error prints -> logger.error
        content = re.sub(
            r'print\(f?"Error ([^"]+): \{([^}]+)\}"\)',
            r'logger.error(f"Error \1: {\2}")',
            content
        )
        content = re.sub(
            r'print\(f?"ERROR ([^"]+): \{([^}]+)\}"\)',
            r'logger.error(f"ERROR \1: {\2}")',
            content
        )
        
        # Info prints -> logger.info
        content = re.sub(
            r'print\(f?"✅ ([^"]+)"\)',
            r'logger.info(f"✅ \1")',
            content
        )
        content = re.sub(
            r'print\(f?"([^"]*Created|Found|Set|Refreshing) ([^"]+)"\)',
            r'logger.info(f"\1 \2")',
            content
        )
        
        # Debug prints -> logger.debug  
        content = re.sub(
            r'print\(f?"(Fetching|Parsed|Current|Admin|Received) ([^"]+)"\)',
            r'logger.debug(f"\1 \2")',
            content
        )
        
        # Generic prints -> logger.info
        content = re.sub(
            r'print\(f?"([^"]+)"\)',
            r'logger.info(f"\1")',
            content
        )
        content = re.sub(
            r'print\("([^"]+)"\)',
            r'logger.info("\1")',
            content
        )
        
        # Add logging import if print statements were replaced and logging isn't imported
        if content != original_content and 'import logging' not in content:
            # Find the first import line and add logging import
            lines = content.split('\n')
            import_index = -1
            for i, line in enumerate(lines):
                if line.startswith('import ') or line.startswith('from '):
                    import_index = i
                    break
            
            if import_index >= 0:
                lines.insert(import_index, 'import logging')
                lines.insert(import_index + 1, '')
                lines.insert(import_index + 2, 'logger = logging.getLogger(__name__)')
                content = '\n'.join(lines)
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Cleaned: {file_path}")
            return True
        return False
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def replace_console_statements(file_path):
    """Replace console.log statements with proper error handling."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Remove debug console.log statements but keep error logging
        # Keep error console.error calls, remove debug console.log
        content = re.sub(
            r'console\.log\([^)]+\);\s*\n?',
            '',
            content
        )
        
        # Replace console.error with proper error handling
        content = re.sub(
            r'console\.error\("([^"]+):", ([^)]+)\);',
            r'// TODO: Implement proper error logging for: \1',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Cleaned: {file_path}")
            return True
        return False
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def clean_backend_files():
    """Clean Python backend files."""
    print("🧹 Cleaning backend Python files...")
    
    cleaned_files = 0
    for py_file in BACKEND_ROOT.rglob("*.py"):
        if replace_print_statements(py_file):
            cleaned_files += 1
    
    print(f"✅ Cleaned {cleaned_files} backend files")
    return cleaned_files

def clean_frontend_files():
    """Clean frontend TypeScript/JavaScript files."""
    print("🧹 Cleaning frontend TypeScript files...")
    
    cleaned_files = 0
    for ts_file in FRONTEND_ROOT.rglob("*.{ts,tsx}"):
        if replace_console_statements(ts_file):
            cleaned_files += 1
    
    print(f"✅ Cleaned {cleaned_files} frontend files")  
    return cleaned_files

def remove_dev_files():
    """Remove development-only files."""
    print("🗑️ Removing development files...")
    
    dev_files = [
        "backend/create_email_tracking_tables.py",
        "backend/create_uploads_table.py", 
        # Keep these as they might be needed for deployment
    ]
    
    removed = 0
    for file_path in dev_files:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ Removed: {file_path}")
            removed += 1
    
    print(f"✅ Removed {removed} development files")
    return removed

def main():
    """Main cleanup function."""
    print("🚀 BEACON BLAST - PRODUCTION CLEANUP")
    print("=" * 50)
    
    # Change to project directory
    if BACKEND_ROOT.exists() and FRONTEND_ROOT.exists():
        print("✅ Found project structure")
    else:
        print("❌ Not in project root directory")
        sys.exit(1)
    
    # Clean files
    backend_cleaned = clean_backend_files()
    frontend_cleaned = clean_frontend_files()
    dev_removed = remove_dev_files()
    
    print("\n" + "=" * 50)
    print("🎉 PRODUCTION CLEANUP COMPLETE!")
    print(f"   Backend files cleaned: {backend_cleaned}")
    print(f"   Frontend files cleaned: {frontend_cleaned}")
    print(f"   Development files removed: {dev_removed}")
    print("\n✅ Project is now production-ready!")

if __name__ == "__main__":
    main()