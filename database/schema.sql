/**------------------------------------------------------------------------------------------------------------------------------------
 * ?                                             Portale-PoliTO MySQL Schema (MySQL 8.4.3)
 * @createdOn       :   09 November 2024
 * @lastModifiedOn  :   23 January 2025
 * @thesis_proposaldescription     :   SQL Schema for the Portale-PoliTO Database. Designed for MySQL 8.4.3
 * @note            :   [1681] Integer display width is deprecated and will be removed in a future release.
                        Therefore, we have removed the display width from the INT data type in the provided original schema as well.
                        Also, remember that BOOLEAN data type is treated as an alias for TINYINT(1) since version 5.0 of MySQL.
 *------------------------------------------------------------------------------------------------------------------------------------**/

-- Drop database if it already exists
DROP DATABASE IF EXISTS polito;
CREATE DATABASE IF NOT EXISTS polito;
USE polito;

-- Drop tables if they already exist
DROP TABLE IF EXISTS logged_student;
DROP TABLE IF EXISTS thesis_proposal_supervisor_cosupervisor;
DROP TABLE IF EXISTS thesis_proposal_type;
DROP TABLE IF EXISTS thesis_proposal_keyword;
DROP TABLE IF EXISTS thesis_proposal_degree;
DROP TABLE IF EXISTS thesis_proposal;
DROP TABLE IF EXISTS type;
DROP TABLE IF EXISTS keyword;
DROP TABLE IF EXISTS teacher;
DROP TABLE IF EXISTS student;
DROP TABLE IF EXISTS degree_programme;
DROP TABLE IF EXISTS degree_programme_container;
DROP TABLE IF EXISTS collegio;
DROP TABLE IF EXISTS thesis_application;

-- Table for storing collegi data
CREATE TABLE IF NOT EXISTS collegio (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Table for storing degrees' containers data
CREATE TABLE IF NOT EXISTS degree_programme_container (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL
);

-- Table for storing degree programmes' data
CREATE TABLE IF NOT EXISTS degree_programme (
    id VARCHAR(10) PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    description_en VARCHAR(255) NOT NULL,
    level ENUM("1", "2") NOT NULL, -- 1 for Bachelor, 2 for Master
    id_collegio VARCHAR(10) NOT NULL,
    container_id VARCHAR(10) NOT NULL,
    FOREIGN KEY (id_collegio) REFERENCES collegio(id) ON DELETE RESTRICT, -- RESTRICT policy in order to pay attention to the deletion of a collegio
    FOREIGN KEY (container_id) REFERENCES degree_programme_container(id) ON DELETE RESTRICT -- RESTRICT policy in order to pay attention to the deletion of a degree programme container
);

-- Table for storing companies
CREATE TABLE IF NOT EXISTS company (
    id INT AUTO_INCREMENT PRIMARY KEY,
    corporate_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS company_office (
    id INT AUTO_INCREMENT NOT NULL,
    company_id INT NOT NULL,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    state_or_province VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    PRIMARY KEY (id, company_id),
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT -- RESTRICT policy in order to pay attention to the deletion of a company  
);

-- Table for storing students' data 
CREATE TABLE IF NOT EXISTS student (
    -- misalignment regarding the data types used to store STUDENTS(id) and TEACHERS(id)
    id VARCHAR(6) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_picture_url VARCHAR(100) DEFAULT NULL,
    degree_id VARCHAR(10) NOT NULL,
    FOREIGN KEY (degree_id) REFERENCES degree_programme(id) ON DELETE RESTRICT -- RESTRICT policy in order to pay attention to the deletion of a degree programme
);

-- Table for storing teachers' data
CREATE TABLE IF NOT EXISTS teacher (
    -- misalignment regarding the data types used to store STUDENTS(id) and TEACHERS(id)
    id INT PRIMARY KEY, -- provided schema specifies INT(10)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    profile_url VARCHAR(100) NOT NULL,
    profile_picture_url VARCHAR(100) DEFAULT NULL,
    facility_short_name VARCHAR(50) NOT NULL
);

-- Table for storing keywords
CREATE TABLE IF NOT EXISTS keyword (
    id INT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(50) DEFAULT NULL,
    keyword_en VARCHAR(50) DEFAULT NULL
);

-- Table for storing types
CREATE TABLE IF NOT EXISTS type (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) DEFAULT NULL,
    type_en VARCHAR(50) DEFAULT NULL
);

-- Table for storing thesis proposals' data
CREATE TABLE IF NOT EXISTS thesis_proposal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    topic_en VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    description_en TEXT NOT NULL,
    link TEXT DEFAULT NULL,
    required_skills TEXT DEFAULT NULL,
    required_skills_en TEXT DEFAULT NULL,
    additional_notes TEXT DEFAULT NULL,
    additional_notes_en TEXT DEFAULT NULL,
    external_cosupervisors VARCHAR(500) DEFAULT NULL,
    creation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiration_date DATETIME NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT 1,
    is_abroad BOOLEAN NOT NULL DEFAULT 0,
    attachment_url VARCHAR(100) DEFAULT NULL,
    level ENUM("1", "2") NOT NULL, -- 1 for Bachelor, 2 for Master
    id_collegio VARCHAR(10) NOT NULL,
    FOREIGN KEY (id_collegio) REFERENCES collegio(id) ON DELETE RESTRICT -- RESTRICT policy in order to pay attention to the deletion of a collegio
);

-- Table for linking thesis proposals with degree programmes containers
CREATE TABLE IF NOT EXISTS thesis_proposal_degree (
    thesis_proposal_id INT NOT NULL,
    container_id VARCHAR(10) NOT NULL,
    PRIMARY KEY (thesis_proposal_id, container_id),
    FOREIGN KEY (thesis_proposal_id) REFERENCES thesis_proposal(id) ON DELETE CASCADE,
    FOREIGN KEY (container_id) REFERENCES degree_programme_container(id) ON DELETE RESTRICT -- RESTRICT policy in order to pay attention to the deletion of a degree programme
);

-- Table for linking thesis proposals with keywords
CREATE TABLE IF NOT EXISTS thesis_proposal_keyword (
    thesis_proposal_id INT NOT NULL,
    keyword_id INT NOT NULL,
    PRIMARY KEY (thesis_proposal_id, keyword_id),
    FOREIGN KEY (thesis_proposal_id) REFERENCES thesis_proposal(id) ON DELETE CASCADE,
    FOREIGN KEY (keyword_id) REFERENCES keyword(id) ON DELETE CASCADE
);

-- Table for linking thesis proposals with types
CREATE TABLE IF NOT EXISTS thesis_proposal_type (
    thesis_proposal_id INT NOT NULL,
    type_id INT NOT NULL,
    PRIMARY KEY (thesis_proposal_id, type_id),
    FOREIGN KEY (thesis_proposal_id) REFERENCES thesis_proposal(id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES type(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS thesis_proposal_company (
    thesis_proposal_id INT NOT NULL,
    company_id INT NOT NULL,
    PRIMARY KEY (thesis_proposal_id, company_id),
    FOREIGN KEY (thesis_proposal_id) REFERENCES thesis_proposal(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT -- RESTRICT policy in order to pay attention to the deletion of a company
);

-- Table for linking thesis proposals with supervisors and cosupervisors
CREATE TABLE IF NOT EXISTS thesis_proposal_supervisor_cosupervisor (
    thesis_proposal_id INT NOT NULL,
    teacher_id INT NOT NULL, -- provided schema specifies INT(10)
    is_supervisor BOOLEAN NOT NULL, -- if true then supervisor, else cosupervisor
    PRIMARY KEY (thesis_proposal_id, teacher_id),
    FOREIGN KEY (thesis_proposal_id) REFERENCES thesis_proposal(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE RESTRICT -- RESTRICT policy because why should you delete a teacher?
);

-- Table for storing the id of the logged student
CREATE TABLE IF NOT EXISTS logged_student (
    student_id VARCHAR(6) PRIMARY KEY,
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS thesis_application (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(6) NOT NULL,
    thesis_proposal_id INT,
    company_id INT,
    topic TEXT NOT NULL,
    submission_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected', 'canceled') NOT NULL DEFAULT 'pending',
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE RESTRICT, -- RESTRICT policy because why should you delete a student?
    FOREIGN KEY (thesis_proposal_id) REFERENCES thesis_proposal(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT -- RESTRICT
);

CREATE TABLE IF NOT EXISTS thesis_application_supervisor_cosupervisor(
    thesis_application_id INT NOT NULL,
    teacher_id INT NOT NULL,
    is_supervisor BOOLEAN NOT NULL, -- if true then supervisor, else cosupervisor
    PRIMARY KEY (thesis_application_id, teacher_id),
    FOREIGN KEY (thesis_application_id) REFERENCES thesis_application(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE RESTRICT -- RESTRICT policy because why should you delete a teacher?
);


CREATE TABLE IF NOT EXISTS thesis_application_status_history(
    id INT AUTO_INCREMENT NOT NULL,
    thesis_application_id INT NOT NULL,
    old_status ENUM('pending', 'approved', 'rejected', 'canceled'),
    new_status ENUM('pending', 'approved', 'rejected', 'canceled') NOT NULL,
    note VARCHAR(255),
    change_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (thesis_application_id) REFERENCES thesis_application(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS thesis(
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic TEXT NOT NULL,
    company_id INT,
    student_id VARCHAR(6) NOT NULL,
    thesis_application_date DATETIME NOT NULL,
    thesis_conclusion_request_date DATETIME,
    thesis_conclusion_confirmation_date DATETIME
);


CREATE TABLE IF NOT EXISTS thesis_supervisor_cosupervisor(
    thesis_id INT NOT NULL,
    teacher_id INT NOT NULL,
    is_supervisor BOOLEAN NOT NULL, -- if true then supervisor, else cosupervisor
    PRIMARY KEY (thesis_id, teacher_id),
    FOREIGN KEY (thesis_id) REFERENCES thesis(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE RESTRICT -- RESTRICT policy because why should you delete a teacher?
);


CREATE TABLE IF NOT EXISTS license(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS thesis_conclusion(
    id INT AUTO_INCREMENT PRIMARY KEY,
    thesis_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_eng VARCHAR(255) NOT NULL,
    language ENUM('it', 'en') NOT NULL,
    abstract TEXT NOT NULL,
    abstract_eng TEXT NOT NULL,
    thesis_file BLOB NOT NULL,
    thesis_resume BLOB,
    license_id INT NOT NULL,
    FOREIGN KEY (thesis_id) REFERENCES thesis(id) ON DELETE CASCADE,
    FOREIGN KEY (license_id) REFERENCES license(id) ON DELETE RESTRICT -- RESTRICT policy because why should you delete a license?
);

CREATE TABLE IF NOT EXISTS thesis_conclusion_keyword(
    id INT AUTO_INCREMENT PRIMARY KEY,
    thesis_conclusion_id INT NOT NULL,
    keyword_id INT NOT NULL,
    FOREIGN KEY (keyword_id) REFERENCES keyword(id) ON DELETE CASCADE,
    FOREIGN KEY (thesis_conclusion_id) REFERENCES thesis_conclusion(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS thesis_conclusion_supervisor_cosupervisor(
    thesis_conclusion_id INT NOT NULL,
    teacher_id INT NOT NULL,
    is_supervisor BOOLEAN NOT NULL, -- if true then supervisor, else cosupervisor
    PRIMARY KEY (thesis_conclusion_id, teacher_id),
    FOREIGN KEY (thesis_conclusion_id) REFERENCES thesis_conclusion(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE RESTRICT -- RESTRICT policy because why should you delete a teacher?
);

CREATE TABLE IF NOT EXISTS embargo_motivation(
    id INT AUTO_INCREMENT PRIMARY KEY,
    motivation VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS embargo(
    motivation_id INT NOT NULL,
    thesis_conclusion_id INT NOT NULL,
    other_motivation TEXT,
    month_duration ENUM('12', '18', '36', 'after_explicit_consent') NOT NULL,
    PRIMARY KEY (motivation_id, thesis_conclusion_id),
    FOREIGN KEY (motivation_id) REFERENCES embargo_motivation(id) ON DELETE CASCADE,
    FOREIGN KEY (thesis_conclusion_id) REFERENCES thesis_conclusion(id) ON DELETE CASCADE
);



/**---------------------------------------------------------------------
 **               SQL Syntax
    *   TINYTEXT    max 255 characters
    *   TEXT        max 65,535 characters
    *   MEDIUMTEXT  max 16,777,215 characters
    *   LONGTEXT    max 4,294,967,295 characters
    *   Sometimes VARCHAR(x) is used for a better indexing performance.
 *-----------------------------------------------------------------------**/