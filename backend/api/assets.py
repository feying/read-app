from pathlib import Path
from flask import jsonify, send_from_directory

from backend.api import assets_bp


@assets_bp.route('/src/<path:filename>')
def serve_mineru_asset(filename: str):
    base_dir = Path(__file__).resolve().parent.parent / 'src'
    target = base_dir / filename
    if not target.exists():
        return jsonify({'error': '文件不存在'}), 404
    return send_from_directory(base_dir, filename)
