INSERT INTO media_items (key, type, tag, title_fr, copy_fr, thumbnail, published, published_at)
VALUES
    ('tshopo-forest', 'video', 'Biodiversité', 'Comprendre la forêt de la Tshopo', 'Une première découverte des espèces et des équilibres qui rendent notre région unique.', 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=900&q=80', TRUE, NOW()),
    ('small-difference', 'resource', 'Déchets', 'Un geste, une différence', 'Quelques réflexes simples à adopter à l''école et à la maison.', 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80', TRUE, NOW()),
    ('water-guardians-quiz', 'activity', 'Eau', 'Le quiz des gardiens de l''eau', 'Un support ludique pour animer une discussion en classe.', 'https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=900&q=80', TRUE, NOW())
ON CONFLICT (key) DO NOTHING;
