-- ============================================================
-- ward-db  (owned by ward-service)
-- Tables: wards
-- ============================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!50503 SET NAMES utf8mb4 */;

--
-- Table structure for table `wards`
--

DROP TABLE IF EXISTS `wards`;
CREATE TABLE `wards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ward_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `asset_count` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ward_name` (`ward_name`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

LOCK TABLES `wards` WRITE;
/*!40000 ALTER TABLE `wards` DISABLE KEYS */;
INSERT INTO `wards` VALUES (1,'ICU',1),(2,'ER',1),(3,'Radiology',0),(6,'Warehouse',0),(9,'Laboratorium',0),(10,'Apotek',0),(11,'Ruang Operasi',0),(12,'NICU',0);
/*!40000 ALTER TABLE `wards` ENABLE KEYS */;
UNLOCK TABLES;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
