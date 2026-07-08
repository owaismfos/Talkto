CREATE DATABASE IF NOT EXISTS Talkto
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
  
USE Talkto;

CREATE TABLE users (
  id            CHAR(36)        NOT NULL DEFAULT (UUID()),
  phone_number  VARCHAR(20)     NOT NULL,
  username      VARCHAR(50)     NULL,
  password_hash VARCHAR(255)    NOT NULL,
  avatar_url    TEXT            NULL,
  is_active     TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone    (phone_number),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
  
CREATE TABLE sessions (
  id            CHAR(36)        NOT NULL DEFAULT (UUID()),
  user_id       CHAR(36)        NOT NULL,
  refresh_token VARCHAR(512)    NOT NULL,
  device_id     VARCHAR(255)    NOT NULL,
  device_name   VARCHAR(100)    NULL,
  fcm_token     TEXT            NULL,
  is_active     TINYINT      NOT NULL DEFAULT 1,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_used_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3),
 
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_refresh_token  (refresh_token(255)),
  UNIQUE KEY uq_sessions_user_device    (user_id, device_id),
 
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
  
CREATE TABLE messages (
  id          CHAR(36)      NOT NULL DEFAULT (UUID()),
  sender_id   CHAR(36)      NOT NULL,
  receiver_id CHAR(36)      NOT NULL,
  content     TEXT          NULL,
  msg_type    ENUM(
                'text','image','video','audio','file'
              )             NOT NULL DEFAULT 'text',
  media_url   TEXT          NULL,
  status      ENUM(
                'sent','delivered','read'
              )             NOT NULL DEFAULT 'sent',
  created_at  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  read_at     DATETIME(3)   NULL,
 
  PRIMARY KEY (id),
 
  CONSTRAINT fk_messages_sender
    FOREIGN KEY (sender_id)   REFERENCES users(id),
  CONSTRAINT fk_messages_receiver
    FOREIGN KEY (receiver_id) REFERENCES users(id),
 
  INDEX idx_messages_sender   (sender_id),
  INDEX idx_messages_receiver (receiver_id),
  INDEX idx_messages_created  (created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
  
  
CREATE TABLE contacts (
  id          CHAR(36)      NOT NULL DEFAULT (UUID()),
  owner_id    CHAR(36)      NOT NULL,
  contact_id  CHAR(36)      NOT NULL,
  nickname    VARCHAR(100)  NULL,
  added_at    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 
  PRIMARY KEY (id),
  UNIQUE KEY uq_contacts_pair (owner_id, contact_id),
 
  CONSTRAINT fk_contacts_owner
    FOREIGN KEY (owner_id)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_contacts_contact
    FOREIGN KEY (contact_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE Talkto.chats (
  id          CHAR(36)      NOT NULL DEFAULT (UUID()),
  owner_id    CHAR(36)      NOT NULL,
  chat_id  CHAR(36)      NOT NULL,
  nickname    VARCHAR(100)  NULL,
  created_at    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 
  PRIMARY KEY (id),
  UNIQUE KEY uq_chats_pair (owner_id, chat_id),
 
  CONSTRAINT fk_chats_owner
    FOREIGN KEY (owner_id)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_chats_chat
    FOREIGN KEY (chat_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
  
CREATE TABLE status_updates (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    content TEXT NULL,
    media_url TEXT NULL,
    status_type ENUM('text','image','video') DEFAULT 'text',
    created_at DATETIME NULL,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_status_updates_user_id (user_id)
);


CREATE TABLE call_history (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    owner_id CHAR(36) NOT NULL,
    peer_id CHAR(36) NOT NULL,

    peer_name VARCHAR(100) NULL,

    direction ENUM('incoming','outgoing','missed') NOT NULL,

    call_type ENUM('voice','video') NOT NULL,

    status ENUM(
        'ringing',
        'accepted',
        'rejected',
        'missed',
        'ended'
    ) DEFAULT 'ringing',

    duration_seconds INT DEFAULT 0,

    started_at DATETIME NULL,
    ended_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_call_history_owner_id (owner_id),
    INDEX idx_call_history_peer_id (peer_id)
);


CREATE TABLE `groups` (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,

    owner_id CHAR(36) NOT NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_groups_owner_id (owner_id)
);


CREATE TABLE group_members (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    group_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,

    role VARCHAR(20) DEFAULT 'member',
    joined_at DATETIME NULL,
    PRIMARY KEY (id),
    INDEX idx_group_members_group_id (group_id),
    INDEX idx_group_members_user_id (user_id),
    UNIQUE KEY uq_group_member (group_id, user_id)
);

 


 INSERT INTO Talkto.messages (id, sender_id, receiver_id, content, msg_type, status, created_at, read_at) VALUES
-- Day 1
-- (UUID(), '075b53a9-b255-4815-8b23-a0b70623d598', '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', 'Hey!', 'text', 'read', '2026-03-25 10:00:00.000', '2026-03-25 10:01:00.000'),
-- (UUID(), '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', '075b53a9-b255-4815-8b23-a0b70623d598', 'Hello!', 'text', 'read', '2026-03-25 10:02:00.000', '2026-03-25 10:03:00.000'),

-- -- Day 2
-- (UUID(), '075b53a9-b255-4815-8b23-a0b70623d598', '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', 'How are you?', 'text', 'read', '2026-03-26 09:15:00.000', '2026-03-26 09:16:00.000'),
-- (UUID(), '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', '075b53a9-b255-4815-8b23-a0b70623d598', 'I am good, you?', 'text', 'read', '2026-03-26 09:17:00.000', '2026-03-26 09:18:00.000'),

-- -- Continue pattern...

-- (UUID(), '075b53a9-b255-4815-8b23-a0b70623d598', '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', 'What are you doing?', 'text', 'read', '2026-03-26 11:00:00.000', '2026-03-26 11:01:00.000'),
-- (UUID(), '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', '075b53a9-b255-4815-8b23-a0b70623d598', 'Working on project', 'text', 'read', '2026-03-26 11:02:00.000', '2026-03-26 11:03:00.000'),

-- -- Day 3
-- (UUID(), '075b53a9-b255-4815-8b23-a0b70623d598', '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', 'Did you complete it?', 'text', 'read', '2026-03-27 14:10:00.000', '2026-03-27 14:11:00.000'),
-- (UUID(), '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', '075b53a9-b255-4815-8b23-a0b70623d598', 'Almost done', 'text', 'read', '2026-03-27 14:12:00.000', '2026-03-27 14:13:00.000'),

-- -- Randomized continuing messages (condensed for brevity)

(UUID(), '075b53a9-b255-4815-8b23-a0b70623d598', '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', 'Let’s meet tomorrow', 'text', 'delivered', '2026-03-28 18:20:00.000', NULL),
(UUID(), '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', '075b53a9-b255-4815-8b23-a0b70623d598', 'Sure!', 'text', 'read', '2026-03-28 18:21:00.000', '2026-03-28 18:22:00.000'),

(UUID(), '075b53a9-b255-4815-8b23-a0b70623d598', '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', 'Are you coming?', 'text', 'sent', '2026-03-31 09:00:00.000', NULL),
(UUID(), '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', '075b53a9-b255-4815-8b23-a0b70623d598', 'Yes on the way', 'text', 'read', '2026-03-31 09:05:00.000', '2026-03-29 09:06:00.000'),

-- Continue pattern until 50 rows...

(UUID(), '075b53a9-b255-4815-8b23-a0b70623d598', '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', 'See you soon', 'text', 'sent', '2026-03-31 20:00:00.000', NULL),
(UUID(), '583be7b1-7e2a-4fc3-900c-2a024ddf3be7', '075b53a9-b255-4815-8b23-a0b70623d598', 'Bye!', 'text', 'read', '2026-03-31 20:01:00.000', '2026-03-30 20:02:00.000');