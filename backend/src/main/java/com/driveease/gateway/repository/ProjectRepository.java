package com.driveease.gateway.repository;

import com.driveease.gateway.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository
        extends JpaRepository<Project, Long> {
}