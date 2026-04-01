# Geração da apresentação institucional (PPTX)

Este diretório contém um script para gerar automaticamente a apresentação em `.pptx` da reunião com docentes do curso de Engenharia de Energias Renováveis (IFSP Câmpus Matão).

## Como rodar

```bash
python3 -m pip install -r tools/requirements-presentation.txt
python3 tools/gerar_apresentacao_ifsp.py
```

## Saída

O arquivo gerado será:

- `dist/reuniao-docentes-ifsp-matao.pptx`
