INSERT INTO impact_stats (key, value, label_fr, label_en, display_order)
VALUES
    ('students-reached', '500+', 'élèves sensibilisés', 'students reached', 1),
    ('trees-planted', '200+', 'arbres plantés', 'trees planted', 2),
    ('pilot-schools', '5', 'écoles pilotes', 'pilot schools', 3),
    ('workshops-held', '30+', 'ateliers menés', 'workshops held', 4)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    label_fr = EXCLUDED.label_fr,
    label_en = EXCLUDED.label_en,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();
