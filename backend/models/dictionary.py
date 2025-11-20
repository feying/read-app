from backend.extensions import db


class Dictionary(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    data = db.Column(db.Text, nullable=False)
