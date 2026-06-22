-- ============================================================
-- auth-db  (owned by auth-service)
-- Tables: users
-- ============================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!50503 SET NAMES utf8mb4 */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` enum('admin','staff','nurse') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'staff',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (3,'admin','$2b$10$uoq2.e5z2RV1kWl8Gx.JYO5ZgRAXtdL1vvTUAI0Mhu8dnnnhRBK1G','admin','2026-05-15 16:56:58'),(4,'Logistiks1','$2b$10$EOlFh97UA6HdpSt0.c3MxuEuRgGQLI94TfAcZ7prAUmxr5uGfZt9u','staff','2026-05-16 06:24:12'),(5,'Perawats1','$2b$10$EOlFh97UA6HdpSt0.c3MxuEuRgGQLI94TfAcZ7prAUmxr5uGfZt9u','nurse','2026-05-16 06:24:59');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
