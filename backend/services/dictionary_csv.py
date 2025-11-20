import csv
import io
import json

KEY_ALIASES = {'word', 'term', 'key', 'entry'}
VALUE_ALIASES = {'translation', 'value', 'meaning', 'definition'}


def parse_dictionary_csv(file_storage, ignore_id_name: bool = False):
    """
    Parse an uploaded CSV into a dict of word -> translation.
    Returns (entries_dict, csv_id, csv_name).
    """
    content = file_storage.read()
    if not content:
        raise ValueError('CSV 文件为空')
    try:
        text = content.decode('utf-8-sig')
    except Exception:
        text = content.decode(errors='ignore')

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError('CSV 缺少表头')

    fieldnames = [f.strip() for f in reader.fieldnames if f is not None]
    lowers = [f.lower() for f in fieldnames]

    id_col = None if ignore_id_name else next((f for f, l in zip(fieldnames, lowers) if l == 'id'), None)
    name_col = None if ignore_id_name else next((f for f, l in zip(fieldnames, lowers) if l == 'name'), None)
    key_col = next((f for f, l in zip(fieldnames, lowers) if l in KEY_ALIASES), None)
    value_col = next((f for f, l in zip(fieldnames, lowers) if l in VALUE_ALIASES), None)

    usable_cols = [f for f in fieldnames if f not in {id_col, name_col}]
    if not key_col and usable_cols:
        key_col = usable_cols[0]
    if not value_col and len(usable_cols) >= 2:
        value_col = usable_cols[1]

    if not key_col or not value_col:
        raise ValueError('CSV 需要包含词条和释义两列')

    entries = {}
    csv_id_value = None
    csv_name_value = None

    for row in reader:
        if csv_id_value is None and id_col and row.get(id_col):
            csv_id_value = str(row.get(id_col)).strip()
        if csv_name_value is None and name_col and row.get(name_col):
            csv_name_value = str(row.get(name_col)).strip()

        key = str(row.get(key_col) or '').strip()
        value = str(row.get(value_col) or '').strip()
        if not key:
            continue
        entries[key] = value

    if not entries:
        raise ValueError('CSV 未解析到任何词条')

    return entries, csv_id_value, csv_name_value


def build_dictionary_csv(dic) -> str:
    try:
        data = json.loads(dic.data or '{}')
    except Exception:
        data = {}
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'name', 'word', 'translation'])
    for word in sorted(data.keys()):
        writer.writerow([dic.id, dic.name, word, data.get(word, '')])
    return output.getvalue()
