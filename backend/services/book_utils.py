import re


TAG_RE = re.compile(r'<[^>]+>')


def strip_tags(html: str) -> str:
    return TAG_RE.sub(' ', html or '')


def _slugify(text: str) -> str:
    base = (text or '').lower()
    base = re.sub(r'[^a-z0-9]+', '_', base)
    base = base.strip('_')
    return base or 'book'


def generate_unique_book_id(base_title: str, existing_lookup) -> str:
    """
    existing_lookup: callable(book_id) -> bool，用于判定 book_id 是否已存在（通常 Book.query.get）
    """
    slug = _slugify(base_title)
    candidate = slug
    counter = 1
    while existing_lookup(candidate):
        candidate = f'{slug}_{counter}'
        counter += 1
    return candidate
