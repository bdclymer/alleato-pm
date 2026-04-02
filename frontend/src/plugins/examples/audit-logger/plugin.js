/**
 * Audit Logger Plugin
 * Tracks all changes to projects and documents for compliance
 */

// Plugin exports
module.exports = {
  // Plugin lifecycle
  lifecycle: {
    onInstall: async function() {
      },
    
    onEnable: async function() {
      },
    
    onDisable: async function() {
      },
    
    onUninstall: async function() {
      },
  },
  
  // Hook handlers
  hooks: {
    'after:project:create': async function(context, api) {
      const { data, user, project } = context;
      
      // Log project creation
      await api.storage.set(`audit_project_${project.id}_created`, {
        timestamp: new Date().toISOString(),
        user: user.email,
        action: 'created',
        projectId: project.id,
        projectName: project.name,
        details: data,
      });
      
      // Send notification
      api.ui.showNotification(
        `Project "${project.name}" created - audit log recorded`,
        'info'
      );
    },
    
    'after:project:update': async function(context, api) {
      const { data, user, project } = context;
      
      // Get previous audit logs
      const auditKey = `audit_project_${project.id}_updates`;
      const previousLogs = await api.storage.get(auditKey) || [];
      
      // Add new log entry
      previousLogs.push({
        timestamp: new Date().toISOString(),
        user: user.email,
        action: 'updated',
        changes: data,
      });
      
      // Store updated logs
      await api.storage.set(auditKey, previousLogs);
    },
    
    'after:project:delete': async function(context, api) {
      const { data, user, project } = context;
      
      // Log deletion (store in a permanent location)
      await api.storage.set(`audit_deleted_project_${project.id}`, {
        timestamp: new Date().toISOString(),
        user: user.email,
        action: 'deleted',
        projectId: project.id,
        projectName: project.name,
        finalState: data,
      });
    },
    
    'after:document:upload': async function(context, api) {
      const { data, user, project } = context;
      
      // Log document upload
      const auditKey = `audit_project_${project.id}_documents`;
      const documentLogs = await api.storage.get(auditKey) || [];
      
      documentLogs.push({
        timestamp: new Date().toISOString(),
        user: user.email,
        action: 'document_uploaded',
        documentName: data.name,
        documentType: data.type,
        documentSize: data.size,
      });
      
      await api.storage.set(auditKey, documentLogs);
    },
    
    'menu:project:actions': async function(context, api) {
      // Add audit log viewer to project menu
      api.ui.registerMenuItem('project-actions', {
        id: 'view-audit-logs',
        label: 'View Audit Logs',
        icon: 'FileText',
        action: async () => {
          const logs = await api.storage.get(`audit_project_${context.project.id}_updates`) || [];
          
          // Show modal with audit logs
          api.ui.showModal(
            React.createElement(AuditLogViewer, { logs, projectId: context.project.id })
          );
        },
      });
    },
    
    'dashboard:widget': async function(context, api) {
      // Register audit summary widget
      api.ui.registerWidget({
        id: 'audit-summary',
        title: 'Audit Activity',
        description: 'Recent audit events across all projects',
        component: AuditSummaryWidget,
        defaultSize: { w: 4, h: 2 },
        minSize: { w: 3, h: 2 },
        maxSize: { w: 6, h: 4 },
      });
    },
  },
  
  // Components (would be loaded from components.js in production)
  components: {
    settings: function SettingsComponent({ api }) {
      const [retentionDays, setRetentionDays] = React.useState(90);
      const [emailAlerts, setEmailAlerts] = React.useState(false);
      
      React.useEffect(() => {
        // Load settings
        api.storage.get('settings').then(settings => {
          if (settings) {
            setRetentionDays(settings.retentionDays || 90);
            setEmailAlerts(settings.emailAlerts || false);
          }
        });
      }, []);
      
      const saveSettings = async () => {
        await api.storage.set('settings', {
          retentionDays,
          emailAlerts,
        });
        api.ui.showNotification('Settings saved', 'success');
      };
      
      return React.createElement('div', { className: 'space-y-4' },
        React.createElement('div', {},
          React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Retention Period (days)'),
          React.createElement('input', {
            type: 'number',
            value: retentionDays,
            onChange: (e) => setRetentionDays(parseInt(e.target.value)),
            className: 'w-full px-3 py-2 border rounded-md',
            min: 30,
            max: 365,
          })
        ),
        React.createElement('div', { className: 'flex items-center space-x-2' },
          React.createElement('input', {
            type: 'checkbox',
            id: 'email-alerts',
            checked: emailAlerts,
            onChange: (e) => setEmailAlerts(e.target.checked),
            className: 'rounded',
          }),
          React.createElement('label', { htmlFor: 'email-alerts', className: 'text-sm' }, 'Send email alerts for critical changes')
        ),
        React.createElement('button', {
          onClick: saveSettings,
          className: 'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600',
        }, 'Save Settings')
      );
    },
  },
};

// Helper components (would be in separate file)
function AuditLogViewer({ logs, projectId }) {
  return React.createElement('div', { className: 'space-y-4' },
    React.createElement('h3', { className: 'text-lg font-semibold' }, 'Audit Logs'),
    React.createElement('div', { className: 'max-h-96 overflow-y-auto' },
      logs.length === 0 
        ? React.createElement('p', { className: 'text-muted-foreground' }, 'No audit logs found')
        : logs.map((log, index) => 
            React.createElement('div', { 
              key: index, 
              className: 'border-b pb-2 mb-2' 
            },
              React.createElement('div', { className: 'flex justify-between' },
                React.createElement('span', { className: 'font-medium' }, log.action),
                React.createElement('span', { className: 'text-sm text-muted-foreground' }, 
                  new Date(log.timestamp).toLocaleString()
                )
              ),
              React.createElement('div', { className: 'text-sm text-muted-foreground' },
                'By: ', log.user
              ),
              log.changes && React.createElement('pre', { 
                className: 'mt-1 text-xs bg-muted p-2 rounded overflow-x-auto' 
              }, JSON.stringify(log.changes, null, 2))
            )
          )
    )
  );
}

function AuditSummaryWidget({ api }) {
  const [summary, setSummary] = React.useState({
    totalEvents: 0,
    recentEvents: [],
    mostActiveUsers: [],
  });
  
  React.useEffect(() => {
    // In a real implementation, this would aggregate audit data
    setSummary({
      totalEvents: 42,
      recentEvents: [
        { action: 'Project Updated', time: '2 hours ago', user: 'john@example.com' },
        { action: 'Document Uploaded', time: '3 hours ago', user: 'jane@example.com' },
        { action: 'Project Created', time: '5 hours ago', user: 'admin@example.com' },
      ],
      mostActiveUsers: [
        { email: 'john@example.com', actions: 15 },
        { email: 'jane@example.com', actions: 12 },
      ],
    });
  }, []);
  
  return React.createElement('div', { className: 'p-4' },
    React.createElement('div', { className: 'mb-4' },
      React.createElement('div', { className: 'text-2xl font-bold' }, summary.totalEvents),
      React.createElement('div', { className: 'text-sm text-muted-foreground' }, 'Total audit events this month')
    ),
    React.createElement('div', { className: 'space-y-2' },
      React.createElement('h4', { className: 'font-medium text-sm' }, 'Recent Activity'),
      summary.recentEvents.map((event, i) => 
        React.createElement('div', { 
          key: i, 
          className: 'text-xs flex justify-between' 
        },
          React.createElement('span', {}, event.action),
          React.createElement('span', { className: 'text-muted-foreground' }, event.time)
        )
      )
    )
  );
}