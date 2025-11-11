
INSERT OR IGNORE INTO users (name,email,password_hash,role)
VALUES ('Admin','admin@intecap.gt','$2b$10$E9tq8fJc9p3M6Jr0JmYQ6eFa3D3xWqV8fQGQ8w2pH9.4zq2s6dUbe','admin'); -- Admin123!

INSERT INTO rooms (name,module,color,is_occupied) VALUES
('Aula 1','Módulo 1','#22c55e',0),
('Aula 3','Módulo 1','#eab308',0),
('Aula 4','Módulo 1','#06b6d4',0),
('Salón Ejecutivo','Módulo 1','#3b82f6',0),
('Aula de Enderezado','Módulo 1','#ef4444',0);

INSERT INTO resources (name, code, type) VALUES
('Escritorio','I-304-56413','Escritorio'),
('Escritorio','I-304-72879','Escritorio'),
('Escritorio','I-304-80520','Escritorio'),
('Mesa','I-302-10568','Mesa'),
('Mesa','I-328-136038','Mesa');

INSERT INTO room_resources (room_id, resource_id) VALUES (1,1);
INSERT INTO room_resources (room_id, resource_id) VALUES (1,2);
INSERT INTO room_resources (room_id, resource_id) VALUES (5,3);
