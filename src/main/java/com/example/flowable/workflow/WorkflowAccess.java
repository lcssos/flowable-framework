package com.example.flowable.workflow;

import com.example.flowable.common.exception.BusinessException;
import com.example.flowable.identity.CurrentUser;
import org.flowable.engine.HistoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.engine.history.HistoricProcessInstance;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.TaskQuery;
import org.springframework.stereotype.Component;

@Component
public class WorkflowAccess {

    private final RuntimeService runtimeService;
    private final TaskService taskService;
    private final HistoryService historyService;

    public WorkflowAccess(RuntimeService runtimeService, TaskService taskService, HistoryService historyService) {
        this.runtimeService = runtimeService;
        this.taskService = taskService;
        this.historyService = historyService;
    }

    public void ensureCanSeeProcess(String processInstanceId, CurrentUser user) {
        if (user.admin()) {
            return;
        }
        ProcessInstance instance = runtimeService.createProcessInstanceQuery()
                .processInstanceId(processInstanceId)
                .singleResult();
        if (instance != null && user.userId().equals(instance.getStartUserId())) {
            return;
        }
        if (runtimeService.createProcessInstanceQuery()
                .processInstanceId(processInstanceId)
                .involvedUser(user.userId())
                .count()
                > 0) {
            return;
        }
        TaskQuery taskQuery = taskService.createTaskQuery()
                .processInstanceId(processInstanceId)
                .or()
                .taskAssignee(user.userId())
                .taskCandidateUser(user.userId());
        if (!user.groupIds().isEmpty()) {
            taskQuery.taskCandidateGroupIn(user.groupIds());
        }
        if (taskQuery.endOr().count() > 0) {
            return;
        }
        throw BusinessException.forbidden("cannot access process instance");
    }

    public void requireProcessInstance(String id) {
        ProcessInstance runtime = runtimeService.createProcessInstanceQuery().processInstanceId(id).singleResult();
        if (runtime != null) {
            return;
        }
        HistoricProcessInstance historic = historyService.createHistoricProcessInstanceQuery()
                .processInstanceId(id)
                .singleResult();
        if (historic == null) {
            throw BusinessException.notFound("process instance");
        }
    }
}
