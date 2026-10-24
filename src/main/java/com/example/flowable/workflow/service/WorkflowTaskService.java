package com.example.flowable.workflow.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.flowable.common.pagination.PaginationHelper;
import com.example.flowable.common.exception.BusinessException;
import com.example.flowable.identity.dto.CurrentUser;
import com.example.flowable.workflow.dto.TaskView;
import org.flowable.engine.TaskService;
import org.flowable.task.api.Task;
import org.flowable.task.api.TaskQuery;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class WorkflowTaskService {

    private final TaskService taskService;
    private final WorkflowAccess workflowAccess;

    public WorkflowTaskService(TaskService taskService, WorkflowAccess workflowAccess) {
        this.taskService = taskService;
        this.workflowAccess = workflowAccess;
    }

    public Page<TaskView> list(int page, int size, CurrentUser user) {
        if (page < 1 || size < 1) {
            throw BusinessException.badRequest("page and size must be >= 1");
        }
        int start = (page - 1) * size;
        TaskQuery query = taskService.createTaskQuery();
        if (!user.admin()) {
            query.or().taskAssignee(user.userId()).taskCandidateUser(user.userId());
            if (!user.groupIds().isEmpty()) {
                query.taskCandidateGroupIn(user.groupIds());
            }
            query.endOr();
        }
        query.orderByTaskCreateTime().desc();
        long total = query.count();
        List<TaskView> items = query.listPage(start, size).stream().map(WorkflowTaskService::toTaskView).toList();
        return PaginationHelper.buildPage(page, size, total, items);
    }

    public void claim(String taskId, CurrentUser user) {
        Task task = requireTask(taskId);
        workflowAccess.ensureCanActOnTask(task, user);
        taskService.claim(taskId, user.userId());
    }

    public void complete(String taskId, Map<String, Object> variables, CurrentUser user) {
        Task task = requireTask(taskId);
        workflowAccess.ensureCanActOnTask(task, user);
        Map<String, Object> vars = variables != null ? new HashMap<>(variables) : new HashMap<>();
        String key = task.getTaskDefinitionKey();
        if ("managerApproval".equals(key) || "hrApproval".equals(key)) {
            if (!(vars.get("approved") instanceof Boolean)) {
                throw BusinessException.badRequest("approved must be a boolean");
            }
        }
        if (user.admin()) {
            if (task.getAssignee() == null || !user.userId().equals(task.getAssignee())) {
                taskService.setAssignee(taskId, user.userId());
            }
        } else if (task.getAssignee() == null || !user.userId().equals(task.getAssignee())) {
            taskService.claim(taskId, user.userId());
        }
        taskService.complete(taskId, vars);
    }

    private Task requireTask(String taskId) {
        Task task = taskService.createTaskQuery().taskId(taskId).singleResult();
        if (task == null) {
            throw BusinessException.notFound("task");
        }
        return task;
    }

    private static TaskView toTaskView(Task task) {
        return new TaskView(
                task.getId(),
                task.getName(),
                task.getProcessInstanceId(),
                task.getAssignee(),
                task.getTaskDefinitionKey(),
                toInstant(task.getCreateTime()));
    }

    private static Instant toInstant(Date date) {
        return date == null ? null : date.toInstant();
    }
}
