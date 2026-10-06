"""
bot/linkedin/selectors.py
Todos os seletores CSS do LinkedIn (interface em português) num só lugar.
Quando o HTML do LinkedIn mudar, só este arquivo e o parsing precisam mudar.
Os testes em tests/test_linkedin_parsing.py provam estes seletores contra os
snapshots de tests/fixtures/.
"""

# Lista de resultados
CARD = ".job-card-container, [data-job-id]"
CARD_TITLE = ".job-card-list__title, .job-card-container__link"
CARD_COMPANY = ".job-card-container__primary-description, .artdeco-entity-lockup__subtitle"
CARD_LOCATION = ".job-card-container__metadata-item, .artdeco-entity-lockup__caption"
CARD_LINK = 'a[href*="/jobs/view/"]'

# Página da Vaga
EASY_APPLY_BUTTON = "button.jobs-apply-button"
DESCRIPTION = ".jobs-description__content, #job-details"

# Formulário Easy Apply
MODAL = ".jobs-easy-apply-modal"
NEXT_BUTTON = "button[data-easy-apply-next-button]"
REVIEW_BUTTON = "button[data-live-test-easy-apply-review-button]"
SUBMIT_BUTTON = "button[data-live-test-easy-apply-submit-button]"
RESUME_INPUT = f'{MODAL} input[type="file"]'
RESUME_ATTACHED = ".jobs-document-upload-redesign-card__container"
FORM_FIELD = "[data-test-form-element]"
FORM_FIELD_INPUT = "input:not([type=file]):not([type=hidden]), select, textarea"
DISMISS_BUTTON = f"{MODAL} button[data-test-modal-close-btn]"
DISCARD_BUTTON = "button[data-test-dialog-primary-btn]"

# Confirmação do envio
CONFIRMATION = '[data-test-modal-id="post-apply-modal"]'
CONFIRMATION_DISMISS = f"{CONFIRMATION} button[data-test-modal-close-btn]"
CONFIRMATION_TEXT = "candidatura enviada"
