# Snapshots de DOM do LinkedIn (português)

Usados por `tests/test_linkedin_parsing.py` para provar os seletores de `bot/linkedin/selectors.py`.

Os arquivos atuais foram escritos à mão no formato do LinkedIn pt-BR, sem dados pessoais.
Para substituí-los por snapshots reais, rode uma vez `python gravar.py` (modo `confirmar`,
conta logada) e copie os HTMLs de `storage/gravacao/` para esta pasta com os mesmos nomes.
Se algum seletor deixar de casar, ajuste `bot/linkedin/selectors.py`.
