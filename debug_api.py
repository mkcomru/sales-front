import json

try:
    with open('/tmp/backend_openapi.json', 'r') as f:
        data = json.load(f)

    paths = data.get('paths', {})
    schemas = data.get('components', {}).get('schemas', {})

    print("=== USERS / MANAGERS ===")
    for path in paths:
        if 'users' in path or 'manager' in path:
            print(f"Path: {path}")

    print("\n=== THREADS FILTERING ===")
    thread_path = "/api/v1/companies/{company_id}/threads"
    if thread_path in paths:
        get_op = paths[thread_path].get('get', {})
        params = get_op.get('parameters', [])
        for p in params:
            print(f"Param: {p.get('name')} ({p.get('in')})")
    else:
        print(f"Path {thread_path} not found")

    print("\n=== AUTH REFRESH ===")
    for path in paths:
        if 'auth' in path or 'refresh' in path:
            print(f"Path: {path}")

    print("\n=== MESSAGE TYPES ===")
    msg_schema = schemas.get('MessageType', {})
    if 'enum' in msg_schema:
        print(f"Enums: {msg_schema['enum']}")
    else:
        print("MessageType enum not found directly")

    print("\n=== PRODUCTS ===")
    for path in paths:
        if 'product' in path:
            print(f"Path: {path}")
            
except Exception as e:
    print(f"Error: {e}")
