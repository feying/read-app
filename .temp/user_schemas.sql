-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: reading_app
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_book_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_page` int DEFAULT NULL,
  `reading_progress` text COLLATE utf8mb4_unicode_ci,
  `user_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'1@qq.com','$2b$12$P1l9k584DaD0pV7VT64iCuNDOBr5CCCSJrRzz8GzE4FdE4m4H11Ty','sk-65865a49bdef43b583c9d6f739ae6b39',NULL,1,NULL,NULL,NULL),(2,'2@qq.com','$2b$12$devA27mFmWCop2CpqiJwKeiYl0QiTUOhQ5SbS4NAc5gDjLrIHkOKy',NULL,NULL,1,NULL,NULL,NULL),(3,'3@qq.com','$2b$12$e4BC3ak0iFRYgs9x5V8CzOVvUI9DlVKTbFn3y5IRLbmntweQKusGG',NULL,'book_mineru_011',2,'{}',NULL,NULL),(4,'4@qq.com','$2b$12$yFJAbRiENS8DBYfc4gjgj.PWzYLiPboZBsiJiDQ9xGxJKaraks79i',NULL,'process_safety_primer',1,'{\"process_safety_primer-p0-68\":{\"translationText\":\"火炬\",\"isEnhanced\":false},\"process_safety_primer-p1-187\":{\"translationText\":\"未找到\",\"isEnhanced\":false},\"process_safety_primer-p1-188\":{\"translationText\":\"未找到\",\"isEnhanced\":false},\"process_safety_primer-p1-61\":{\"translationText\":\"未找到\",\"isEnhanced\":false},\"process_safety_primer-p1-11\":{\"translationText\":\"未找到\",\"isEnhanced\":false},\"process_safety_primer-p1-77\":{\"translationText\":\"未找到\",\"isEnhanced\":false}}','我是4','2025-11-20 08:56:38'),(5,'5@qq.com','$2b$12$AsWkFA.dDpHmJ2Z6DVW9l..KQV.PRv55oNUNlwMKkhXLmXHC8g7Ni',NULL,'book_mineru_011',3,'{\"book_mineru_011-p3-25\":{\"translationText\":\"未找到\",\"isEnhanced\":false},\"book_mineru_011-p3-27\":{\"translationText\":\"未找到\",\"isEnhanced\":false},\"book_mineru_011-p3-29\":{\"translationText\":\"未找到\",\"isEnhanced\":false},\"book_mineru_011-p3-30\":{\"translationText\":\"未找到\",\"isEnhanced\":false},\"book_mineru_011-p3-33\":{\"translationText\":\"未找到\",\"isEnhanced\":false}}','我是5',NULL);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-21 11:14:44
