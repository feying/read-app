import json
import re
import shutil
from pathlib import Path
from flask import request, jsonify, current_app, Response
from flask_jwt_extended import (
    jwt_required,
    create_access_token,
    get_jwt,
)
from werkzeug.utils import secure_filename

from backend.api import admin_bp
from backend.config import ALLOWED_ORIGINS
from backend.extensions import db
from backend.models import Book, BookPage, BookChapter, Dictionary, User
from backend.services.book_utils import generate_unique_book_id
from backend.services.pdf_import import extract_pdf_pages, save_base64_images, rewrite_src_to_absolute
from backend.services.dictionary_csv import parse_dictionary_csv, build_dictionary_csv


def serialize_admin_user(user: User) -> dict:
    return {
        'id': user.id,
        'email': user.email,
        'user_name': getattr(user, 'user_name', None),
        'currentBookId': user.current_book_id,
        'currentPage': user.current_page,
        'isSuspended': getattr(user, 'is_suspended', False),
    }


def admin_required(fn):
    from functools import wraps

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims.get('is_admin'):
            return jsonify({'error': 'Forbidden'}), 403
        return fn(*args, **kwargs)

    return wrapper


@admin_bp.after_request
def add_admin_cors(response):
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response


@admin_bp.route('/<path:_dummy>', methods=['OPTIONS'])
def admin_options(_dummy: str):
    resp = jsonify({'status': 'ok'})
    return add_admin_cors(resp), 200


@admin_bp.post('/login')
def admin_login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''

    if email != current_app.config.get('ADMIN_EMAIL') or password != current_app.config.get('ADMIN_PASSWORD'):
        return jsonify({'error': '管理员账号或密码错误'}), 401

    token = create_access_token(
        identity=f'admin:{email}',
        additional_claims={'is_admin': True}
    )
    return jsonify({'message': '管理员登录成功', 'token': token}), 200


@admin_bp.get('/books')
@admin_required
def admin_list_books():
    books = Book.query.all()
    items = []
    for book in books:
        items.append({
            'id': book.id,
            'title': book.title,
            'description': book.description,
            'defaultDictionaryId': book.default_dictionary_id,
            'origin': book.origin or 'default',
            'pageCount': book.pages.count() if hasattr(book.pages, 'count') else len(book.pages or []),
            'chapterCount': len(book.chapters or [])
        })
    return jsonify({'items': items}), 200


@admin_bp.post('/books/upload_pdf')
@admin_required
def admin_upload_pdf_book():
    origin_value = (request.form.get('origin') or '').strip() or 'default'
    origin = origin_value[:50] or 'default'
    origin_lower = origin.lower()

    allow_append = (request.form.get('allow_append') or '').lower() in {'1', 'true', 'yes', 'y', 'on'}
    overwrite_conflicts = (request.form.get('overwrite_conflicts') or '').lower() in {'1', 'true', 'yes', 'y', 'on'}

    files = request.files.getlist('file') or []
    if not files:
        return jsonify({'error': '请上传文件'}), 400

    dictionary_id = (request.form.get('default_dictionary_id') or '').strip() or None
    if dictionary_id and not Dictionary.query.get(dictionary_id):
        return jsonify({'error': '默认词典 ID 不存在'}), 400

    provided_book_id = (request.form.get('book_id') or '').strip()
    book_id = None
    book_title = ''
    book_description = ''

    pages_data: list[dict] = []
    chapter_title = ''
    chapter_summary = ''

    if origin_lower == 'mineru':
        bad = [f for f in files if not (f.filename or '').lower().endswith(('.html', '.htm'))]
        if bad:
            return jsonify({'error': 'MinerU 仅支持上传 HTML 文件'}), 400

        def _num_key(name: str):
            lowered = (name or '').lower()
            m = re.search(r'(\d+)', lowered)
            num = int(m.group(1)) if m else 10**9
            return (num, lowered)

        files.sort(key=lambda f: _num_key(f.filename))

        first_name = secure_filename(files[0].filename or '') or '未知文件'
        inferred_title = Path(first_name).stem or '自动导入图书'
        book_title = (request.form.get('title') or inferred_title).strip() or inferred_title
        book_description = (request.form.get('description') or f'来源 HTML {first_name} 导入').strip() or f'来源 HTML {first_name} 导入'
        book_id = provided_book_id or generate_unique_book_id(book_title, lambda bid: Book.query.get(bid))
        chapter_title = f'{book_title} - MinerU 导入'
        chapter_summary = '管理员通过 MinerU HTML 导入图书'

        base_url = request.host_url.rstrip('/') if request else ''
        for file_storage in files:
            raw_bytes = file_storage.read()
            if not raw_bytes:
                continue
            try:
                html_text = raw_bytes.decode('utf-8', errors='ignore')
            except Exception:
                html_text = raw_bytes.decode(errors='ignore')
            match = re.search(r'<body[^>]*>(.*?)</body>', html_text, flags=re.IGNORECASE | re.DOTALL)
            body_html = (match.group(1).strip() if match else html_text.strip())
            if not body_html:
                continue
            num_match = re.search(r'(\d+)', file_storage.filename or '')
            page_number = int(num_match.group(1)) if num_match else len(pages_data)
            pages_data.append({
                'page_number': page_number,
                'body_html': body_html,
                'base_url': base_url
            })

        if not pages_data:
            return jsonify({'error': '未提取到有效的 HTML 内容'}), 400

    else:
        file_storage = files[0]
        filename = secure_filename(file_storage.filename)
        if not filename.lower().endswith('.pdf'):
            return jsonify({'error': '仅支持上传 PDF 文件'}), 400
        try:
            pages_html = extract_pdf_pages(file_storage)
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400
        except Exception:
            return jsonify({'error': '解析 PDF 时发生未知错误'}), 500

        inferred_title = Path(filename).stem or '自动导入图书'
        book_title = (request.form.get('title') or inferred_title).strip() or inferred_title
        book_description = (request.form.get('description') or f'来源 PDF {filename} 自动分页导入').strip() or f'来源 PDF {filename} 自动分页导入'
        book_id = provided_book_id or generate_unique_book_id(book_title, lambda bid: Book.query.get(bid))
        chapter_title = f'{book_title} - 原始分页'
        chapter_summary = '由管理员上传 PDF 自动生成的章节'

        pages_data = [
            {'page_number': idx, 'html_content': html_content}
            for idx, html_content in enumerate(pages_html)
        ]

    existing_book = Book.query.get(book_id) if book_id else None
    if existing_book and not allow_append:
        return jsonify({'error': '已有同名书籍，是否继续追加？', 'needsAppendConfirm': True}), 409

    try:
        if existing_book and allow_append:
            book = existing_book
        else:
            book = Book(
                id=book_id,
                title=book_title,
                description=book_description,
                default_dictionary_id=dictionary_id,
                origin=origin
            )
            db.session.add(book)
            db.session.flush()

        chapter = BookChapter.query.filter_by(book_id=book.id).order_by(BookChapter.chapter_number.asc()).first()
        if not chapter:
            chapter = BookChapter(
                book=book,
                chapter_number=1,
                title=chapter_title or (book.title + ' - 章节'),
                summary=chapter_summary or '管理员导入',
                start_page=0
            )
            db.session.add(chapter)
            db.session.flush()

        existing_pages = BookPage.query.filter_by(book_id=book.id).with_entities(BookPage.page_number).all()
        existing_numbers = {p[0] if not hasattr(p, 'page_number') else p.page_number for p in existing_pages}
        conflict_numbers = [
            entry['page_number']
            for entry in pages_data
            if entry['page_number'] in existing_numbers
        ]

        if conflict_numbers and not overwrite_conflicts:
            return jsonify({
                'error': '导入页码存在冲突，是否覆盖？',
                'conflicts': sorted(conflict_numbers),
                'needsOverwriteConfirm': True
            }), 409

        storage_root = Path(__file__).resolve().parent.parent / 'src'

        if conflict_numbers and overwrite_conflicts:
            BookPage.query.filter(BookPage.book_id == book.id, BookPage.page_number.in_(conflict_numbers)).delete(synchronize_session=False)
            for pn in conflict_numbers:
                dir_path = storage_root / book.id / str(pn)
                if dir_path.exists():
                    shutil.rmtree(dir_path, ignore_errors=True)

        for entry in pages_data:
            page_number = entry['page_number']
            html_content = entry.get('html_content')
            if html_content is None:
                base_url_entry = entry.get('base_url') or (request.host_url.rstrip('/') if request else '')
                processed = save_base64_images(entry.get('body_html') or '', book.id, page_number)
                html_content = f'<article class="pdf-source-page" data-origin-page="{page_number}">{processed}</article>'
                html_content = rewrite_src_to_absolute(html_content, base_url_entry)
            db.session.add(BookPage(
                book=book,
                chapter=chapter,
                page_number=page_number,
                html_content=html_content
            ))

        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Admin import failed')
        return jsonify({'error': '写入数据库失败，请查看后台日志'}), 500

    total_pages = BookPage.query.filter_by(book_id=book.id).count()
    return jsonify({
        'message': '导入成功',
        'book': {
            'id': book.id,
            'title': book.title,
            'pageCount': total_pages
        }
    }), 201


@admin_bp.delete('/books/<book_id>')
@admin_required
def admin_delete_book(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '书籍不存在'}), 404

    storage_root = Path(__file__).resolve().parent.parent / 'src'
    book_storage_dir = storage_root / book_id

    try:
        removed_pages = BookPage.query.filter_by(book_id=book_id).delete(synchronize_session=False)
        removed_chapters = BookChapter.query.filter_by(book_id=book_id).delete(synchronize_session=False)
        affected_users = (
            User.query.filter(User.current_book_id == book_id)
            .update({
                User.current_book_id: None,
                User.current_page: 1,
                User.reading_progress: None,
            }, synchronize_session=False)
        )
        db.session.delete(book)
        if book_storage_dir.exists():
            shutil.rmtree(book_storage_dir, ignore_errors=True)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Admin delete book failed')
        return jsonify({'error': '删除书籍失败'}), 500

    return jsonify({
        'message': '书籍已删除',
        'book_id': book_id,
        'removed': {
            'pages': removed_pages,
            'chapters': removed_chapters,
            'affectedUsers': affected_users,
        }
    }), 200


@admin_bp.get('/books/<book_id>/page_numbers')
@admin_required
def admin_list_book_page_numbers(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '书籍不存在'}), 404
    pages = (
        BookPage.query.filter_by(book_id=book_id)
        .with_entities(BookPage.page_number)
        .order_by(BookPage.page_number.asc())
        .all()
    )
    numbers = [p[0] if not hasattr(p, 'page_number') else p.page_number for p in pages]
    return jsonify({'bookId': book_id, 'pageNumbers': numbers}), 200


@admin_bp.delete('/books/<book_id>/pages')
@admin_required
def admin_delete_selected_pages(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '书籍不存在'}), 404

    data = request.get_json(silent=True) or {}
    raw_numbers = data.get('page_numbers')
    if not isinstance(raw_numbers, list) or not raw_numbers:
        return jsonify({'error': '请提供要删除的页码列表'}), 400

    try:
        page_numbers = sorted({int(num) for num in raw_numbers})
    except (TypeError, ValueError):
        return jsonify({'error': '页码必须为数字'}), 400

    pages_query = (
        BookPage.query.filter_by(book_id=book_id)
        .filter(BookPage.page_number.in_(page_numbers))
    )
    found_pages = pages_query.all()
    if not found_pages:
        return jsonify({'error': '未找到对应页码'}), 404

    storage_root = Path(__file__).resolve().parent.parent / 'src'

    try:
        for page in found_pages:
            dir_path = storage_root / book_id / str(page.page_number)
            if dir_path.exists():
                shutil.rmtree(dir_path, ignore_errors=True)
            db.session.delete(page)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Admin delete specific pages failed')
        return jsonify({'error': '删除指定页时发生错误'}), 500

    return jsonify({
        'message': '指定页已删除',
        'book_id': book_id,
        'removedPageNumbers': page_numbers
    }), 200


@admin_bp.get('/books/<book_id>/chapters')
@admin_required
def admin_list_book_chapters(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '书籍不存在'}), 404
    chapters = (
        BookChapter.query.filter_by(book_id=book_id)
        .order_by(BookChapter.chapter_number.asc())
        .all()
    )
    items = [{
        'id': chapter.id,
        'chapterNumber': chapter.chapter_number,
        'title': chapter.title,
        'summary': chapter.summary,
        'startPage': chapter.start_page
    } for chapter in chapters]
    return jsonify({'bookId': book_id, 'chapters': items}), 200


@admin_bp.post('/books/<book_id>/chapters')
@admin_required
def admin_save_book_chapter_details(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '书籍不存在'}), 404

    data = request.get_json(silent=True) or {}
    chapter_id = data.get('chapter_id')
    chapter_number = data.get('chapter_number')
    title = (data.get('title') or '').strip()
    summary = (data.get('summary') or '').strip()
    start_page = data.get('start_page')

    try:
        chapter_number = int(chapter_number)
        start_page = int(start_page)
    except (TypeError, ValueError):
        return jsonify({'error': '章节号和起始页需为数字'}), 400

    if chapter_number < 0 or start_page < 0:
        return jsonify({'error': '章节号和起始页需为非负数字'}), 400
    if not title:
        return jsonify({'error': '标题不能为空'}), 400

    if chapter_id:
        chapter = BookChapter.query.filter_by(id=chapter_id, book_id=book_id).first()
        if not chapter:
            return jsonify({'error': '指定章节不存在'}), 404
    else:
        chapter = BookChapter(book=book)
        db.session.add(chapter)

    chapter.chapter_number = chapter_number
    chapter.title = title
    chapter.summary = summary
    chapter.start_page = start_page

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Admin save chapter failed')
        return jsonify({'error': '章节保存失败'}), 500

    return jsonify({
        'message': '章节已保存',
        'chapter': {
            'id': chapter.id,
            'chapterNumber': chapter.chapter_number,
            'title': chapter.title,
            'summary': chapter.summary,
            'startPage': chapter.start_page
        }
    }), 200


@admin_bp.get('/dictionaries')
@admin_required
def admin_list_dictionaries():
    dictionaries = Dictionary.query.all()
    items = []
    for dic in dictionaries:
        try:
            parsed = json.loads(dic.data)
        except Exception:
            parsed = {}
        data_preview = list(parsed.items())[:5]
        items.append({
            'id': dic.id,
            'name': dic.name,
            'entryCount': len(parsed),
            'preview': data_preview
        })
    return jsonify({'items': items}), 200


@admin_bp.get('/dictionaries/<dict_id>/export_csv')
@admin_required
def admin_export_dictionary_csv(dict_id: str):
    dic = Dictionary.query.get(dict_id)
    if not dic:
        return jsonify({'error': '词典不存在'}), 404
    csv_text = build_dictionary_csv(dic)
    filename = f'{dic.id}.csv'
    resp = Response(csv_text, mimetype='text/csv; charset=utf-8')
    resp.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp


@admin_bp.post('/dictionaries/<dict_id>/import_csv')
@admin_required
def admin_import_dictionary_csv(dict_id: str):
    dic = Dictionary.query.get(dict_id)
    if not dic:
        return jsonify({'error': '词典不存在'}), 404

    file_storage = request.files.get('file')
    if not file_storage:
        return jsonify({'error': '请上传 CSV 文件'}), 400

    try:
        entries, csv_id, csv_name = parse_dictionary_csv(file_storage)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception:
        current_app.logger.exception('Failed to parse dictionary CSV')
        return jsonify({'error': '解析 CSV 失败'}), 400

    if csv_id and csv_id != dict_id:
        return jsonify({'error': 'CSV 中的 id 与目标词典不一致'}), 400

    dic.data = json.dumps(entries, ensure_ascii=False)
    if csv_name:
        dic.name = csv_name
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Admin import dictionary failed')
        return jsonify({'error': '保存词典失败'}), 500

    return jsonify({
        'message': '词典数据已覆盖更新',
        'dictionary': {
            'id': dic.id,
            'name': dic.name,
            'entryCount': len(entries)
        }
    }), 200


@admin_bp.post('/dictionaries')
@admin_required
def admin_create_dictionary():
    dict_id = (request.form.get('id') or '').strip()
    name = (request.form.get('name') or '').strip()
    file_storage = request.files.get('file')

    if not dict_id or not name:
        return jsonify({'error': 'id 与 name 均为必填'}), 400
    if not file_storage:
        return jsonify({'error': '请上传 CSV 文件'}), 400

    if Dictionary.query.get(dict_id):
        return jsonify({'error': '词典 ID 已存在'}), 409
    if Dictionary.query.filter_by(name=name).first():
        return jsonify({'error': '词典名称已存在'}), 409

    try:
        entries, _, _ = parse_dictionary_csv(file_storage, ignore_id_name=True)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception:
        current_app.logger.exception('Failed to parse dictionary CSV')
        return jsonify({'error': '解析 CSV 失败'}), 400

    dic = Dictionary(id=dict_id, name=name, data=json.dumps(entries, ensure_ascii=False))
    try:
        db.session.add(dic)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Admin create dictionary failed')
        return jsonify({'error': '创建词典失败'}), 500

    return jsonify({
        'message': '词典已创建',
        'dictionary': {
            'id': dic.id,
            'name': dic.name,
            'entryCount': len(entries)
        }
    }), 201


@admin_bp.delete('/dictionaries/<dict_id>')
@admin_required
def admin_delete_dictionary(dict_id: str):
    dic = Dictionary.query.get(dict_id)
    if not dic:
        return jsonify({'error': '词典不存在'}), 404
    try:
        # 清空引用默认词典的书籍设置
        Book.query.filter(Book.default_dictionary_id == dict_id).update(
            {Book.default_dictionary_id: None}, synchronize_session=False
        )
        db.session.delete(dic)
        db.session.commit()
    except Exception:  # noqa: BLE001
        db.session.rollback()
        current_app.logger.exception('Admin delete dictionary failed')
        return jsonify({'error': '删除词典失败'}), 500
    return jsonify({'message': '词典已删除', 'dictionary_id': dict_id}), 200


@admin_bp.delete('/users/<int:user_id>')
@admin_required
def admin_delete_user(user_id: int):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    try:
        db.session.delete(user)
        db.session.commit()
    except Exception:  # noqa: BLE001
        db.session.rollback()
        current_app.logger.exception('Admin delete user failed')
        return jsonify({'error': '删除用户失败'}), 500
    return jsonify({'message': '用户已删除', 'userId': user_id}), 200


@admin_bp.post('/users/<int:user_id>/suspend')
@admin_required
def admin_suspend_user(user_id: int):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    if getattr(user, 'is_suspended', False):
        return jsonify({'message': '用户已处于暂停状态', 'user': serialize_admin_user(user)}), 200
    user.is_suspended = True
    try:
        db.session.commit()
    except Exception:  # noqa: BLE001
        db.session.rollback()
        current_app.logger.exception('Admin suspend user failed')
        return jsonify({'error': '暂停用户失败'}), 500
    return jsonify({'message': '用户已暂停并将被强制退出', 'user': serialize_admin_user(user)}), 200


@admin_bp.post('/users/<int:user_id>/unsuspend')
@admin_required
def admin_unsuspend_user(user_id: int):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    if not getattr(user, 'is_suspended', False):
        return jsonify({'message': '用户已是正常状态', 'user': serialize_admin_user(user)}), 200
    user.is_suspended = False
    try:
        db.session.commit()
    except Exception:  # noqa: BLE001
        db.session.rollback()
        current_app.logger.exception('Admin unsuspend user failed')
        return jsonify({'error': '解除暂停失败'}), 500
    return jsonify({'message': '用户已恢复正常，可重新登录', 'user': serialize_admin_user(user)}), 200


@admin_bp.get('/users')
@admin_required
def admin_list_users():
    users = User.query.order_by(User.id.asc()).all()
    items = [serialize_admin_user(user) for user in users]
    return jsonify({'items': items}), 200
