import os
import shutil
import glob
import re

backend_dir = "/Users/tharungowdapr/Documents/college/projects/main el/6th-sem-main-el/backend"
os.chdir(backend_dir)

# Create directories
for d in ['core', 'routes', 'services']:
    os.makedirs(d, exist_ok=True)

# Define where files go
files_to_move = {
    'database.py': 'core',
    'monitoring.py': 'core',
    'admin_routes.py': 'routes',
    'negotiator_routes.py': 'routes',
    'vendor_routes.py': 'routes',
    'create_admin.py': 'core',
    'msp_fetcher.py': 'services',
    'cultivation_advisor.py': 'services',
    'local_inference_service.py': 'services',
    'scraper.py': 'services',
    'crop_recommender.py': 'services',
    'disease_predictor.py': 'services',
    'icar_integration.py': 'services',
    'soil_lookup.py': 'services',
    'yield_prediction.py': 'services',
    'cultivation_manager.py': 'services',
    'real_weather.py': 'services',
    'weather_disease_risk.py': 'services',  # This might overwrite, we'll let it
}

# Move files
for file, dest_folder in files_to_move.items():
    if os.path.exists(file):
        dest_path = os.path.join(dest_folder, file)
        shutil.move(file, dest_path)
        print(f"Moved {file} to {dest_folder}/")

# Mapping of old module names to new module names
import_map = {}
for file, folder in files_to_move.items():
    mod_name = file.replace('.py', '')
    import_map[mod_name] = f"{folder}.{mod_name}"

# Function to replace imports in a file
def update_imports(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content
    for old_mod, new_mod in import_map.items():
        # Match "from X import" and "import X"
        new_content = re.sub(rf'^from\s+{old_mod}\s+import', f'from {new_mod} import', new_content, flags=re.MULTILINE)
        new_content = re.sub(rf'^import\s+{old_mod}(\s|$)', f'import {new_mod}\\1', new_content, flags=re.MULTILINE)
        
        # Also catch nested imports that might have been inline
        new_content = re.sub(rf'(?<!\w)from\s+{old_mod}\s+import', f'from {new_mod} import', new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated imports in {filepath}")

# Update imports in all python files
for py_file in glob.glob('**/*.py', recursive=True):
    if 'venv' not in py_file and '__pycache__' not in py_file:
        update_imports(py_file)

print("Refactoring complete.")
