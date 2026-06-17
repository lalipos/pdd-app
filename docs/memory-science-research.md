# Доказательная база запоминания для приложения ПДД

> Ресёрч-отчёт (источники — первоисточники + работы EMNLP 2024). Основа для механики приложения.

## Топ-5 рычагов запоминаемости (по приоритету)

| # | Рычаг | Цифра | Источник |
|---|-------|-------|----------|
| 1 | **Active recall (testing effect)** | +52% retention vs перечитывание (61% vs 40% через неделю) | Roediger & Karpicke 2006 |
| 2 | **Spaced repetition (FSRS)** | −20-30% повторений при том же retention vs SM-2 | FSRS (Anki 23.10+) |
| 3 | **AI keyword-мнемоники** | 88% vs 28% у контрольной (keyword method); LLM +49% imageability vs человека | Atkinson & Raugh 1975; EMNLP 2024 |
| 4 | **Bizarre imagery + Dual Coding** | dual coding −30-50% когнитивной нагрузки | Paivio; von Restorff |
| 5 | **Generation effect (выбор/правка)** | self-selected cues > assigned cues | мета-анализ 2020 |

## Целевая архитектура (подтверждена наукой)

```
Вопрос ПДД
   ↓
ИИ генерит 3 мнемоники (bizarre image + keyword + визуал)   ← overgenerate-and-rank
   ↓
Пользователь выбирает / редактирует одну                     ← generation effect
   ↓
Active recall: вопрос → вспоминаешь → открываешь ответ        ← рычаг №1
   ↓
FSRS планирует следующее повторение (target 90% retention)   ← рычаг №2
   ↓
При правильном ответе — краткое "почему"                      ← elaborative interrogation
```

## Ключевые нюансы дизайна

1. **Overgenerate-and-rank** — генерить 5+ вариантов, ранжировать по imageability / coherence / простоте слов, показывать лучший + пару альтернатив. (arXiv 2409.13952)
2. **Bizarreness работает только в mixed-list** — если ВСЕ крючки одинаково абсурдны, эффект исчезает. Нужен контраст.
3. **Dual coding** — к крючку образ/иллюстрация (хоть схематичная). Декоративные картинки не работают, только релевантные.
4. **КРИТИЧНО (SMART, EMNLP 2024):** expressed preferences ≠ observed. Нельзя проверять мнемонику вопросом «понравилась?» — мерить реальное retention (тест через день/неделю).
5. **Generation effect** оптимум: 2-3 готовых варианта от ИИ + кнопка «создать свою».

## Метрики качества мнемоники (для промпта генерации)

- **Imageability** — насколько легко нарисовать образ в голове (главная метрика)
- **Coherence** — логичная связь ключевого слова со значением
- **Word complexity** — простые слова (Age of Acquisition)

Структура промпта:
```
Создай мнемонику: [ВОПРОС ПДД] → [ОТВЕТ].
Требования: 1-2 предложения, конкретный абсурдный образ,
звуковая привязка к ключевому числу/слову, легко представить.
Дай 3 варианта.
```

## Ниша

Академических исследований по мнемоникам именно для driving theory **почти нет**. Существующие ПДД-приложения делают упор на practice tests (testing effect), но **не на мнемониках**. AI-мнемоники для ПДД — незаполненная ниша, прямых конкурентов нет.

## Источники

- Roediger & Karpicke 2006 — https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x
- FSRS vs SM-2 — https://www.diane.app/en/guides/fsrs-vs-sm2
- Atkinson & Raugh 1975 (keyword method) — https://eric.ed.gov/?id=EJ118388
- SMART (LLM-мнемоники, EMNLP 2024) — https://arxiv.org/abs/2406.15352 | https://github.com/nbalepur/Mnemonic
- Overgenerate-and-Rank (EMNLP 2024) — https://arxiv.org/abs/2409.13952
- Agnes & Srinivasan 2024 (AI-мнемоники + Anki) — https://www.sciedupress.com/journal/index.php/wjel/article/view/25258
- Dunlosky et al. 2013 (мета-анализ техник) — https://journals.sagepub.com/doi/abs/10.1177/1529100612453266
- Generation effect мета-анализ 2020 — https://link.springer.com/article/10.3758/s13423-020-01762-3
- Bizarreness effect — https://effectiviology.com/von-restorff-isolation-effect/
- Dual coding — https://www.structural-learning.com/post/dual-coding-a-teachers-guide
- Driving theory memory tricks — https://mocktheorytest.com/resources/memory-tricks-to-help-you-learn-the-highway-code/
