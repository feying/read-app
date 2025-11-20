from backend.extensions import db


class Book(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    default_dictionary_id = db.Column(db.String(100), db.ForeignKey('dictionary.id'))
    origin = db.Column(db.String(50), nullable=False, default='default')
    pages = db.relationship('BookPage', backref='book', lazy='dynamic', order_by='BookPage.page_number')
    chapters = db.relationship('BookChapter', backref='book', lazy=True, order_by='BookChapter.chapter_number')


class BookChapter(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.String(100), db.ForeignKey('book.id'), nullable=False)
    chapter_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    summary = db.Column(db.Text)
    start_page = db.Column(db.Integer, default=0)


class BookPage(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.String(100), db.ForeignKey('book.id'), nullable=False)
    page_number = db.Column(db.Integer, nullable=False)
    html_content = db.Column(db.Text, nullable=False)
    chapter_id = db.Column(db.Integer, db.ForeignKey('book_chapter.id'))
    chapter = db.relationship('BookChapter', backref='pages')
