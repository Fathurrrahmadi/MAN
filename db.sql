-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: monorail.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sub_category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `current_ward` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('Available','In Transit','Maintenance','In Use','Sterilization','Out of Stock') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Available',
  `qr_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_hash` (`qr_hash`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assets`
--

LOCK TABLES `assets` WRITE;
/*!40000 ALTER TABLE `assets` DISABLE KEYS */;
INSERT INTO `assets` VALUES (1,'Patient Monitor A1','Electronic',NULL,'ER','Sterilization','qr_hash_12345','2026-05-15 16:29:49'),(2,'Wheelchair W-05','Transport',NULL,'ER','Out of Stock','qr_hash_67890','2026-05-15 16:29:49'),(3,'Monitor A1','Electronic',NULL,'ER','In Use','qr_1779000536884_q20zfl','2026-05-17 06:48:58'),(4,'contoh ','Electronic',NULL,'ICU','In Use','qr_1779112629676_zk631c','2026-05-18 13:57:10'),(5,'IV Pole','Equipment',NULL,'ER','Maintenance','qr_1779172922663_ox38mk','2026-05-19 06:42:03'),(6,'test TL','Equipment',NULL,'Warehouse','Maintenance','qr_1780306732798_7bf7t6','2026-06-01 09:38:53'),(7,'test pindah2 ','Electronic',NULL,'Warehouse','In Transit','qr_1780326163172_rmricg','2026-06-01 15:02:43'),(8,'dummy7','Transport',NULL,'Warehouse','Available','qr_1780326485719_u314k2','2026-06-01 15:08:05'),(9,'test scroll','Electronic','Kursi Roda','ER','Available','qr_1780329861460_zno17j','2026-06-01 16:04:21'),(10,'Bed Pasien 01','Furniture','Tempat Tidur','ICU','In Use','qr_dummy_001','2026-06-09 03:49:01'),(11,'Bed Pasien 02','Furniture','Tempat Tidur','NICU','Available','qr_dummy_002','2026-06-09 03:49:01'),(12,'Syringe Pump A','Electronic','Medis','Ruang Operasi','In Use','qr_dummy_003','2026-06-09 03:49:01'),(13,'Syringe Pump B','Electronic','Medis','NICU','Maintenance','qr_dummy_004','2026-06-09 03:49:01'),(14,'Tabung Oksigen 1','Equipment','Pernapasan','Warehouse','Available','qr_dummy_005','2026-06-09 03:49:01'),(16,'Defibrillator 1','Electronic','Medis','ER','In Use','qr_dummy_007','2026-06-09 03:49:01'),(17,'Kursi Roda W-06','Transport','Kursi Roda','Apotek','Available','qr_dummy_008','2026-06-09 03:49:01'),(18,'Tiang Infus 02','Equipment','Besi','Ruang Operasi','In Use','qr_dummy_009','2026-06-09 03:49:01'),(19,'USG Machine','Electronic','Radiologi','Radiology','Sterilization','qr_dummy_010','2026-06-09 03:49:01'),(20,'Will Delete Later','Dummy','Dummy','ICU','Available','qr_1781187246986_sa10lb','2026-06-11 14:14:07');
/*!40000 ALTER TABLE `assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_actions`
--

DROP TABLE IF EXISTS `maintenance_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_actions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_id` int NOT NULL,
  `start_date` date DEFAULT NULL,
  `estimated_end_date` date DEFAULT NULL,
  `action_date` date DEFAULT NULL,
  `vendor` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT '0.00',
  `duration_days` int DEFAULT '0',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  CONSTRAINT `fk_action_report` FOREIGN KEY (`report_id`) REFERENCES `maintenance_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_actions`
--

LOCK TABLES `maintenance_actions` WRITE;
/*!40000 ALTER TABLE `maintenance_actions` DISABLE KEYS */;
INSERT INTO `maintenance_actions` VALUES (1,1,NULL,NULL,'2026-05-19','',0.00,0,'Selesai','','2026-05-19 06:40:02'),(2,2,NULL,NULL,'2026-05-25','',0.00,0,'Diperbaiki','','2026-05-25 17:12:49'),(3,2,NULL,NULL,'2026-05-25','',0.00,0,'Diperbaiki','','2026-05-25 17:12:54'),(4,4,'2026-06-09','2026-06-17',NULL,'fix.co',0.00,0,'Diperbaiki','','2026-06-01 09:47:32'),(5,4,'2026-06-01','2026-06-17',NULL,'fix.co',0.00,0,'Diperbaiki','','2026-06-01 09:48:00'),(6,3,'2026-06-01','2026-06-04',NULL,'vendor',0.00,0,'Diperbaiki','','2026-06-01 09:48:59'),(7,3,'2026-06-01','2026-06-04','2026-06-01','vendor',100000.00,4,'Selesai','fix','2026-06-01 09:49:19'),(8,2,'2026-06-01','2026-06-09',NULL,'',0.00,0,'Diperbaiki','','2026-06-01 15:09:59'),(9,2,'2026-06-01','2026-06-03','2026-06-02','abc',5000000.00,2,'Selesai','lebih cepat selse','2026-06-01 15:15:56'),(10,5,'2026-06-05','2026-06-07','2026-06-07','Vendor A',150000.00,2,'Selesai','Roda sudah diganti','2026-06-09 03:49:42'),(11,6,'2026-06-06','2026-06-10',NULL,'Vendor B',0.00,0,'Diperbaiki','Menunggu sparepart LCD','2026-06-09 03:49:42'),(12,7,NULL,NULL,NULL,'',0.00,0,'Dilaporkan','','2026-06-09 03:49:42'),(13,8,'2026-06-08','2026-06-09','2026-06-09','Internal',50000.00,1,'Diganti','Ganti kabel power','2026-06-09 03:49:42'),(14,9,NULL,NULL,NULL,'',0.00,0,'Dilaporkan','','2026-06-09 03:49:42'),(15,10,'2026-06-09','2026-06-11','2026-06-10','Vendor C',200000.00,1,'Selesai','Baterai diganti','2026-06-09 03:49:42'),(16,11,'2026-06-09','2026-06-12',NULL,'Internal',0.00,0,'Diperbaiki','Pemesanan tombol baru','2026-06-09 03:49:42'),(17,12,'2026-06-09','2026-06-10','2026-06-10','Internal',0.00,1,'Selesai','Dilas ulang','2026-06-09 03:49:42'),(18,13,NULL,NULL,NULL,'',0.00,0,'Dilaporkan','','2026-06-09 03:49:42'),(19,14,'2026-06-09','2026-06-15',NULL,'Vendor A',0.00,0,'Diperbaiki','Jok sedang dijahit','2026-06-09 03:49:42');
/*!40000 ALTER TABLE `maintenance_actions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_reports`
--

DROP TABLE IF EXISTS `maintenance_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int NOT NULL,
  `asset_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `report_date` date NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `reporter` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('Dilaporkan','Diperbaiki','Diganti','Selesai') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Dilaporkan',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  CONSTRAINT `fk_report_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_reports`
--

LOCK TABLES `maintenance_reports` WRITE;
/*!40000 ALTER TABLE `maintenance_reports` DISABLE KEYS */;
INSERT INTO `maintenance_reports` VALUES (1,2,'Wheelchair W-05','Transport','2026-05-17','tets','admin','Selesai','2026-05-17 06:51:40'),(2,5,'IV Pole','Equipment','2026-05-19','test','Scanner','Selesai','2026-05-19 09:12:56'),(3,5,'IV Pole','Equipment','2026-05-19','bbb','Scanner','Selesai','2026-05-19 09:19:59'),(4,6,'test TL','Equipment','2026-06-01','Rusak test','Scanner','Diperbaiki','2026-06-01 09:40:13'),(5,2,'Wheelchair W-05','Transport','2026-06-05','Roda macet','Logistiks1','Selesai','2026-06-09 03:49:30'),(6,4,'contoh','Electronic','2026-06-06','Layar mati','Perawats1','Diperbaiki','2026-06-09 03:49:30'),(7,6,'test TL','Equipment','2026-06-07','Lecet','Logistiks1','Dilaporkan','2026-06-09 03:49:30'),(8,7,'test pindah2','Electronic','2026-06-08','Kabel putus','Perawats1','Diganti','2026-06-09 03:49:30'),(9,8,'dummy7','Transport','2026-06-09','Rem blong','admin','Dilaporkan','2026-06-09 03:49:30'),(10,9,'test scroll','Electronic','2026-06-09','Tidak bisa dinyalakan','Logistiks1','Selesai','2026-06-09 03:49:30'),(11,3,'Monitor A1','Electronic','2026-06-09','Tombol rusak','Perawats1','Diperbaiki','2026-06-09 03:49:30'),(12,5,'IV Pole','Equipment','2026-06-09','Patah','admin','Selesai','2026-06-09 03:49:30'),(13,1,'Patient Monitor A1','Electronic','2026-06-09','Alarm error','Logistiks1','Dilaporkan','2026-06-09 03:49:30'),(14,2,'Wheelchair W-05','Transport','2026-06-09','Jok robek','Perawats1','Diperbaiki','2026-06-09 03:49:30');
/*!40000 ALTER TABLE `maintenance_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transfers`
--

DROP TABLE IF EXISTS `transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int NOT NULL,
  `from_ward` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `to_ward` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `transfer_status` enum('Pending','In Transit','Completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transfers`
--

LOCK TABLES `transfers` WRITE;
/*!40000 ALTER TABLE `transfers` DISABLE KEYS */;
INSERT INTO `transfers` VALUES (1,1,'ICU','ER','Completed','2026-05-18 13:26:24','2026-05-18 13:27:43'),(2,4,'ER','ICU','Completed','2026-05-19 06:39:42','2026-05-19 06:40:39'),(3,3,'ICU','ER','Completed','2026-05-25 16:34:15','2026-05-25 17:04:08'),(4,5,'Radiology','ER','Completed','2026-05-26 01:21:45','2026-06-01 15:11:33'),(6,1,'ER','ICU','Completed','2026-06-09 03:49:21',NULL),(7,2,'Warehouse','ER','Completed','2026-06-09 03:49:21',NULL),(8,3,'ER','Radiology','Pending','2026-06-09 03:49:21',NULL),(9,4,'ICU','Warehouse','In Transit','2026-06-09 03:49:21',NULL),(10,5,'ER','ICU','Completed','2026-06-09 03:49:21',NULL),(11,6,'Warehouse','ER','Pending','2026-06-09 03:49:21',NULL),(13,8,'Warehouse','Radiology','Completed','2026-06-09 03:49:21',NULL),(14,9,'ER','Warehouse','Completed','2026-06-09 03:49:21',NULL),(15,1,'ICU','ER','Pending','2026-06-09 03:49:21',NULL),(18,7,'Warehouse','ICU','In Transit','2026-06-13 04:52:14',NULL);
/*!40000 ALTER TABLE `transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` enum('admin','staff','nurse') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'staff',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (3,'admin','$2b$10$uoq2.e5z2RV1kWl8Gx.JYO5ZgRAXtdL1vvTUAI0Mhu8dnnnhRBK1G','admin','2026-05-15 16:56:58'),(4,'Logistiks1','$2b$10$EOlFh97UA6HdpSt0.c3MxuEuRgGQLI94TfAcZ7prAUmxr5uGfZt9u','staff','2026-05-16 06:24:12'),(5,'Perawats1','$2b$10$EOlFh97UA6HdpSt0.c3MxuEuRgGQLI94TfAcZ7prAUmxr5uGfZt9u','nurse','2026-05-16 06:24:59');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wards`
--

DROP TABLE IF EXISTS `wards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ward_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `asset_count` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ward_name` (`ward_name`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wards`
--

LOCK TABLES `wards` WRITE;
/*!40000 ALTER TABLE `wards` DISABLE KEYS */;
INSERT INTO `wards` VALUES (1,'ICU',1),(2,'ER',1),(3,'Radiology',0),(6,'Warehouse',0),(9,'Laboratorium',0),(10,'Apotek',0),(11,'Ruang Operasi',0),(12,'NICU',0);
/*!40000 ALTER TABLE `wards` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-14 20:19:43
