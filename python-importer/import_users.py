#!/usr/bin/env python3
"""
Multi-School Education Platform - Excel Onboarding Importer Script
SPDX-License-Identifier: Apache-2.0

This script reads raw Excel files where the FIRST ROW contains user names 
(no headers, no other columns) and sends them to the school platform's backend 
bulk-import API.

Requirements:
    pip install pandas openpyxl requests
"""

import os
import sys
import argparse
import pandas as pd
import requests


def get_role_from_filename(filename):
    """
    Infers role based on filename if not explicitly provided.
    """
    name_lower = os.path.basename(filename).lower()
    if "admin" in name_lower:
        return "admin"
    elif "teacher" in name_lower or "instructor" in name_lower:
        return "teacher"
    elif "coordinator" in name_lower or "supervisor" in name_lower:
        return "coordinator"
    elif "student" in name_lower or "pupil" in name_lower:
        return "student"
    return None


def parse_names_from_excel(file_path):
    """
    Parses names from the first row of an Excel sheet (no headers, no labels).
    Assumes each non-empty cell in row 1 is a name.
    """
    if not os.path.exists(file_path):
        print(f"❌ Error: Excel file not found at path: {file_path}")
        sys.exit(1)

    try:
        # Load the excel file without reading headers
        df = pd.read_excel(file_path, header=None)

        if df.empty:
            print("❌ Error: The Excel file is empty.")
            sys.exit(1)

        # Read the first row (row index 0)
        first_row = df.iloc[0]

        # Extract non-empty, valid string names
        names = []
        for val in first_row:
            if pd.notna(val):
                name_str = str(val).strip()
                if name_str:
                    names.append(name_str)

        return names

    except Exception as e:
        print(f"❌ Failed to parse Excel file: {e}")
        sys.exit(1)


def authenticate_admin(api_url, username, password):
    """
    Logs in to the backend auth API using admin credentials to fetch a JWT.
    """
    login_url = f"{api_url.rstrip('/')}/auth/login"
    payload = {"username": username, "password": password}

    print(f"🔑 Authenticating user '{username}'...")
    try:
        response = requests.post(login_url, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            if token:
                print("✅ Authentication successful! JWT retrieved.")
                return token
            else:
                print("❌ Authentication failed: Token missing in response.")
                sys.exit(1)
        else:
            print(f"❌ Authentication failed (Status {response.status_code}): {response.json().get('error', response.text)}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Could not connect to authentication server: {e}")
        sys.exit(1)


def send_bulk_import(api_url, token, school_id, role, names, grade=None, subject=None):
    """
    Sends the list of names to the bulk-import API endpoint.
    """
    import_url = f"{api_url.rstrip('/')}/users/bulk-import"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "schoolId": school_id,
        "role": role,
        "names": names
    }

    if grade:
        payload["grade"] = grade
    if subject:
        payload["subject"] = subject

    print(f"📡 Sending bulk import of {len(names)} users as role '{role}' for school '{school_id}'...")
    try:
        response = requests.post(import_url, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            result = response.json()
            print("\n🎉 Bulk Onboarding Import Complete!")
            print(f"📈 Successful Imports: {result.get('successCount', 0)}")
            
            errors = result.get("errors", [])
            if errors:
                print(f"⚠️ Encountered {len(errors)} warnings/errors:")
                for error in errors[:10]:
                    print(f"   - {error}")
                if len(errors) > 10:
                    print(f"   - ...and {len(errors) - 10} more.")
            
            print("\n📋 Imported User Credentials (usernames and default passwords):")
            for user in result.get("imported", []):
                print(f"   👤 {user.get('name')}  | Username: {user.get('username')}  | Email: {user.get('email')}")
            
            return result
        else:
            error_msg = response.json().get("error", response.text)
            print(f"❌ Bulk import request failed (Status {response.status_code}): {error_msg}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Could not send import requests: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Bulk onboard school users from a custom row-1 Excel spreadsheet.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Import students for school-01, infer student role from filename
  python import_users.py --school school-01 --file students_list.xlsx

  # Explicitly import math teachers with credentials
  python import_users.py --school school-01 --role teacher --subject Mathematics --file teachers.xlsx --username mainadmin --password 1234
        """
    )
    
    parser.add_argument("--school", required=True, help="School ID to assign these users to.")
    parser.add_argument("--file", required=True, help="Path to the Excel .xlsx file.")
    parser.add_argument("--role", choices=["admin", "teacher", "student", "coordinator"], help="Role to assign to these users (admin, teacher, student, coordinator).")
    parser.add_argument("--grade", help="Optional default grade level for students (e.g. 'Grade 10').")
    parser.add_argument("--subject", help="Optional default academic subject for teachers/coordinators (e.g. 'Mathematics').")
    parser.add_argument("--api-url", default="http://localhost:3000/api", help="Base backend API URL path (default: http://localhost:3000/api).")
    parser.add_argument("--username", default="mainadmin", help="Admin account username to login (default: mainadmin).")
    parser.add_argument("--password", default="1234", help="Admin account password to login (default: 1234).")

    args = parser.parse_args()

    # Determine role
    role = args.role
    if not role:
        role = get_role_from_filename(args.file)
        if not role:
            print("❌ Error: Could not infer role from filename. Please specify the role using --role.")
            sys.exit(1)
        print(f"ℹ️ Inferred role '{role}' from filename '{os.path.basename(args.file)}'.")

    # Read names from Excel row 1
    print(f"📖 Parsing Excel file: {args.file}...")
    names = parse_names_from_excel(args.file)
    print(f"✅ Found {len(names)} non-empty names in row 1:")
    print(", ".join(names))

    if not names:
        print("⚠️ No names found in the first row. Aborting.")
        sys.exit(0)

    # Log in and get JWT token
    token = authenticate_admin(args.api_url, args.username, args.password)

    # Perform import
    send_bulk_import(
        api_url=args.api_url,
        token=token,
        school_id=args.school,
        role=role,
        names=names,
        grade=args.grade,
        subject=args.subject
    )


if __name__ == "__main__":
    main()
