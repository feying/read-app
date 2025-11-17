from pathlib import Path
path = Path('frontend/js/admin.js')
text = path.read_text(encoding='utf-8')
start = text.index("pdfUploadForm?.addEventListener('submit'")
end = text.index('(function attemptAutoAdminLogin', start)
new_block = """pdfUploadForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const originValue = (pdfOriginSelect?.value || 'default').trim() || 'default';
    const files = Array.from(pdfFileInput?.files || []);
    if (!files.length) {
        updatePdfUploadStatus('请选择要上传的文件', 'error');
        return;
    }

    const isMinerU = originValue.toLowerCase() === 'mineru';
    if (isMinerU) {
        const invalid = files.find(f => {
            const name = (f.name || '').toLowerCase();
            return !name.endswith('.html') and not name.endswith('.htm')
"""
print('prepare')
