from flask import jsonify, request
import json
from flask_jwt_extended import jwt_required

from backend.api import library_bp
from backend.models import Book, BookPage, Dictionary
from backend.services.book_utils import strip_tags
from backend.services.pdf_import import rewrite_src_to_absolute


def serialize_book_metadata(book: Book) -> dict:
    page_count = book.pages.count() if hasattr(book.pages, 'count') else len(book.pages or [])
    chapters = [
        {
            'id': chapter.id,
            'title': chapter.title,
            'chapterNumber': chapter.chapter_number,
            'startPage': chapter.start_page
        }
        for chapter in book.chapters
    ]
    return {
        'title': book.title,
        'description': book.description,
        'defaultDictionaryId': book.default_dictionary_id,
        'origin': book.origin or 'default',
        'pageCount': page_count,
        'chapters': chapters
    }


@library_bp.route('/library', methods=['GET'])
@jwt_required()
def get_library():
    try:
        books = Book.query.all()
        library_data = {}
        for book in books:
            library_data[book.id] = serialize_book_metadata(book)
        return jsonify(library_data), 200
    except Exception as exc:  # noqa: BLE001
        return jsonify({'error': str(exc)}), 500


@library_bp.route('/dictionaries', methods=['GET'])
@jwt_required()
def get_dictionaries():
    try:
        dictionaries = Dictionary.query.all()
        dict_data = {}
        for item in dictionaries:
            try:
                parsed = json.loads(item.data or '{}')
            except Exception:
                parsed = {}
            dict_data[item.id] = {
                'name': item.name,
                'data': parsed
            }
        return jsonify(dict_data), 200
    except Exception as exc:  # noqa: BLE001
        return jsonify({'error': str(exc)}), 500


@library_bp.route('/books/<book_id>/pages/<int:page_number>', methods=['GET'])
@jwt_required()
def get_book_page(book_id: str, page_number: int):
    try:
        count = int(request.args.get('count', 1))
    except ValueError:
        return jsonify({'error': 'count 参数必须为数字'}), 400
    count = max(1, min(count, 10))
    pages_query = BookPage.query.filter_by(book_id=book_id)
    pages = (
        pages_query
        .filter(BookPage.page_number >= page_number, BookPage.page_number < page_number + count)
        .order_by(BookPage.page_number.asc())
        .all()
    )
    if not pages:
        first_page = pages_query.order_by(BookPage.page_number.asc()).first()
        if first_page and page_number < first_page.page_number:
            pages = (
                pages_query
                .filter(BookPage.page_number >= first_page.page_number, BookPage.page_number < first_page.page_number + count)
                .order_by(BookPage.page_number.asc())
                .all()
            )
        if not pages:
            return jsonify({'error': '未找到页面'}), 404

    base_url = request.host_url.rstrip('/')
    response = [
        {
            'pageNumber': page.page_number,
            'htmlContent': rewrite_src_to_absolute(page.html_content, base_url),
            'chapterTitle': page.chapter.title if page.chapter else None
        }
        for page in pages
    ]
    return jsonify({'bookId': book_id, 'pages': response}), 200


@library_bp.route('/books/<book_id>/page_numbers', methods=['GET'])
@jwt_required()
def get_book_page_numbers(book_id: str):
    pages = (
        BookPage.query.filter_by(book_id=book_id)
        .with_entities(BookPage.page_number)
        .order_by(BookPage.page_number.asc())
        .all()
    )
    nums = [p[0] if not hasattr(p, 'page_number') else p.page_number for p in pages]
    if not nums:
        return jsonify({'error': '未找到对应页'}), 404
    return jsonify({'bookId': book_id, 'pageNumbers': nums}), 200


@library_bp.route('/books/<book_id>/search', methods=['GET'])
@jwt_required()
def search_book(book_id: str):
    query = (request.args.get('q') or '').strip()
    if len(query) < 2:
        return jsonify({'error': '搜索关键词至少需要 2 个字符'}), 400

    like_expr = f"%{query}%"
    pages = (
        BookPage.query.filter_by(book_id=book_id)
        .filter(BookPage.html_content.ilike(like_expr))
        .order_by(BookPage.page_number.asc())
        .limit(20)
        .all()
    )
    results = []
    for page in pages:
        text_content = strip_tags(page.html_content)
        snippet_index = text_content.lower().find(query.lower())
        if snippet_index == -1:
            snippet = text_content[:160]
        else:
            start = max(snippet_index - 60, 0)
            end = min(snippet_index + len(query) + 60, len(text_content))
            snippet = text_content[start:end]
        results.append({
            'pageNumber': page.page_number,
            'chapterTitle': page.chapter.title if page.chapter else None,
            'snippet': snippet.strip()
        })
    return jsonify({'results': results}), 200
