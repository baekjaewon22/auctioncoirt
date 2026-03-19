-- 사용자에 역할 추가
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'pending';
-- pending: 승인 대기, user: 일반 사용자, admin: 관리자

-- admin 계정을 관리자로 설정
UPDATE users SET role = 'admin' WHERE id = 1;
