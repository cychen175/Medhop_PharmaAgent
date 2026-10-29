"""Resolve retrieved GraphRAG records to indexed text; never manufacture citations."""
from pathlib import Path
import pandas as pd


def build_sources(context, output):
    output = Path(output)
    tables = {}
    def table(name):
        if name not in tables:
            path = output / (name + '.parquet')
            tables[name] = pd.read_parquet(path) if path.exists() else pd.DataFrame()
        return tables[name]
    result, seen = [], set()
    def add(kind, record, title, text):
        key = (kind, str(record))
        if key not in seen:
            seen.add(key)
            result.append(dict(kind=kind, id=str(record), title=str(title), text=str(text)))
    def find(name, record, short='human_readable_id'):
        data = table(name)
        if data.empty:
            return None
        mask = data['id'].astype(str).eq(str(record))
        if short in data:
            mask |= data[short].astype(str).eq(str(record))
        rows = data[mask]
        return None if rows.empty else rows.iloc[0]
    def add_text(record):
        row = find('text_units', record)
        if row is None:
            return
        doc = find('documents', row.get('document_id', ''))
        title = doc.get('title', 'MedHop 支持文本') if doc is not None else 'MedHop 支持文本'
        add('Sources', row['human_readable_id'], title, row['text'])
    # Only include records actually admitted to the model context.
    # Put the graph paths' records and their original texts before semantic
    # fallback records, so the first twenty entries expose the central evidence.
    for kind, records in sorted(context.items(), key=lambda item: item[0] != "direct_relationships"):
        if not isinstance(records, pd.DataFrame):
            continue
        if 'in_context' in records:
            records = records[records['in_context'].eq(True)]
        for record in records.to_dict('records'):
            ident = record.get('id', '')
            if kind.lower() in {'direct_relationships', 'relationships'}:
                row = find('relationships', ident)
                if row is not None:
                    add('Relationships', row['human_readable_id'],
                        f"{row['source']} → {row['target']}", row['description'])
                    for unit in row.get('text_unit_ids', []):
                        add_text(unit)
            elif kind.lower() in {'sources', 'text_units', 'original_sources'}:
                add_text(ident)
            elif kind.lower() in {'reports', 'community_reports'}:
                row = find('community_reports', ident, 'community')
                if row is not None:
                    add('Reports', row['community'], row['title'], row['full_content'])
            elif kind.lower() == 'entities':
                row = find('entities', ident)
                if row is not None:
                    add('Entities', row['human_readable_id'], row['title'], row['description'])
    # UI initially shows twenty records; all resolved records stay in the result.
    return result
