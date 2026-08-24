package com.example.flowable.workflow;

import com.example.flowable.common.api.PageData;
import com.example.flowable.common.exception.BusinessException;
import com.example.flowable.identity.CurrentUser;
import com.example.flowable.workflow.dto.ProcessInstanceDetail;
import com.example.flowable.workflow.dto.ProcessInstanceView;
import com.example.flowable.workflow.dto.TaskView;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.engine.runtime.ProcessInstanceQuery;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.List;

@Service
public class ProcessQueryService {

    private final RuntimeService runtimeService;
    private final TaskService taskService;
    private final WorkflowAccess workflowAccess;

    public ProcessQueryService(
            RuntimeService runtimeService, TaskService taskService, WorkflowAccess workflowAccess) {
        this.runtimeService = runtimeService;
        this.taskService = taskService;
        this.workflowAccess = workflowAccess;
    }

    public PageData<ProcessInstanceView> listRuntime(int page, int size, CurrentUser user) {
        if (page < 1 || size < 1) {
            throw BusinessException.badRequest("page and size must be >= 1");
        }
        int start = (page - 1) * size;
        ProcessInstanceQuery query = runtimeService.createProcessInstanceQuery();
        if (!user.admin()) {
            query.startedBy(user.userId());
        }
        query.orderByStartTime().desc();
        long total = query.count();
        List<ProcessInstanceView> items = query.listPage(start, size).stream().map(ProcessQueryService::toView).toList();
        return new PageData<>(page, size, total, items);
    }

    public ProcessInstanceDetail getRuntime(String id, CurrentUser user) {
        ProcessInstance instance = runtimeService.createProcessInstanceQuery().processInstanceId(id).singleResult();
        if (instance == null) {
            throw BusinessException.notFound("process instance");
        }
        workflowAccess.ensureCanSeeProcess(id, user);
        List<TaskView> currentTasks = taskService.createTaskQuery().processInstanceId(id).list().stream()
                .map(ProcessQueryService::toTaskView)
                .toList();
        return new ProcessInstanceDetail(toView(instance), currentTasks);
    }

    public void deleteRuntime(String id, CurrentUser user) {
        ProcessInstance instance = runtimeService.createProcessInstanceQuery().processInstanceId(id).singleResult();
        if (instance == null) {
            throw BusinessException.notFound("process instance");
        }
        if (!user.admin() && !user.userId().equals(instance.getStartUserId())) {
            throw BusinessException.forbidden("cannot delete process instance");
        }
        runtimeService.deleteProcessInstance(id, "deleted by " + user.userId());
    }

    private static ProcessInstanceView toView(ProcessInstance instance) {
        return new ProcessInstanceView(
                instance.getId(),
                instance.getProcessDefinitionKey(),
                instance.getProcessDefinitionName(),
                instance.getStartUserId(),
                toInstant(instance.getStartTime()));
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
