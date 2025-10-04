import { pool } from '../server.js';

// Approval workflow utilities
export const createApprovalWorkflow = async (expenseId, companyId, amount) => {
  try {
    // Get active approval workflows for this amount range
    const workflowResult = await pool.query(`
      SELECT aw.*, aws.step_order, aws.approver_id, aws.is_required
      FROM approval_workflows aw
      JOIN approval_workflow_steps aws ON aw.id = aws.workflow_id
      WHERE aw.company_id = $1 
        AND aw.is_active = true
        AND ($2 >= aw.min_amount OR aw.min_amount IS NULL)
        AND ($2 <= aw.max_amount OR aw.max_amount IS NULL)
      ORDER BY aws.step_order
    `, [companyId, amount]);

    let firstApproverId = null;

    if (workflowResult.rows.length === 0) {
      // No workflow found, check if manager approval is required
      const expenseResult = await pool.query(
        'SELECT employee_id FROM expenses WHERE id = $1',
        [expenseId]
      );
      
      if (expenseResult.rows.length === 0) {
        throw new Error('Expense not found');
      }

      const employeeId = expenseResult.rows[0].employee_id;
      
      // Get employee's manager
      const managerResult = await pool.query(`
        SELECT u.id, u.is_manager_approver
        FROM users u
        WHERE u.id = (SELECT manager_id FROM users WHERE id = $1)
          AND u.is_manager_approver = true
      `, [employeeId]);

      if (managerResult.rows.length > 0) {
        // Create approval for manager
        await pool.query(`
          INSERT INTO expense_approvals (expense_id, approver_id, status)
          VALUES ($1, $2, 'pending')
        `, [expenseId, managerResult.rows[0].id]);
        firstApproverId = managerResult.rows[0].id;
      }
    } else {
      // Create approvals for each step in the workflow
      for (const step of workflowResult.rows) {
        await pool.query(`
          INSERT INTO expense_approvals (expense_id, approver_id, workflow_step_id, status)
          VALUES ($1, $2, $3, 'pending')
        `, [expenseId, step.approver_id, step.id]);
      }
      firstApproverId = workflowResult.rows[0]?.approver_id;
    }

    // Create notification for first approver (only if we have one)
    if (firstApproverId) {
      await createApprovalNotification(expenseId, firstApproverId);
    }
    
  } catch (error) {
    console.error('Error creating approval workflow:', error);
    throw error;
  }
};

export const processApprovalDecision = async (expenseId, approverId, status, comments) => {
  try {
    console.log('Processing approval decision:', { expenseId, approverId, status, comments });
    
    // Update the approval
    const updateResult = await pool.query(`
      UPDATE expense_approvals 
      SET status = $1, comments = $2, approved_at = CURRENT_TIMESTAMP
      WHERE expense_id = $3 AND approver_id = $4
    `, [status, comments, expenseId, approverId]);
    
    console.log('Approval update result:', updateResult.rowCount, 'rows updated');

    if (status === 'rejected') {
      // If rejected, update expense status and stop workflow
      await pool.query(`
        UPDATE expenses 
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [expenseId]);
      
      return { status: 'rejected', message: 'Expense rejected' };
    }

    // Check if all required approvals are complete
    const approvalResult = await pool.query(`
      SELECT 
        COUNT(*) as total_approvals,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN is_required = true AND status = 'pending' THEN 1 END) as pending_required
      FROM expense_approvals ea
      JOIN approval_workflow_steps aws ON ea.workflow_step_id = aws.id
      WHERE ea.expense_id = $1
    `, [expenseId]);

    const { total_approvals, approved_count, rejected_count, pending_required } = approvalResult.rows[0];

    if (rejected_count > 0) {
      // If any approval is rejected, reject the expense
      await pool.query(`
        UPDATE expenses 
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [expenseId]);
      
      return { status: 'rejected', message: 'Expense rejected' };
    }

    if (pending_required > 0) {
      // Still waiting for required approvals
      return { status: 'pending', message: 'Waiting for more approvals' };
    }

    // Check conditional approval rules
    const conditionalResult = await checkConditionalApprovalRules(expenseId);
    if (conditionalResult.approved) {
      await pool.query(`
        UPDATE expenses 
        SET status = 'approved', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [expenseId]);
      
      return { status: 'approved', message: 'Expense approved' };
    }

    // If all required approvals are done but no conditional rules met,
    // check if we have enough approvals based on percentage rules
    const percentageResult = await checkPercentageApprovalRules(expenseId, approved_count, total_approvals);
    if (percentageResult.approved) {
      await pool.query(`
        UPDATE expenses 
        SET status = 'approved', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [expenseId]);
      
      return { status: 'approved', message: 'Expense approved' };
    }

    return { status: 'pending', message: 'Waiting for more approvals' };
    
  } catch (error) {
    console.error('Error processing approval decision:', error);
    throw error;
  }
};

const checkConditionalApprovalRules = async (expenseId) => {
  try {
    // Get expense details
    const expenseResult = await pool.query(`
      SELECT e.amount_in_company_currency, e.company_id
      FROM expenses e
      WHERE e.id = $1
    `, [expenseId]);

    if (expenseResult.rows.length === 0) {
      return { approved: false };
    }

    const { amount_in_company_currency, company_id } = expenseResult.rows[0];

    // Get applicable conditional rules
    const rulesResult = await pool.query(`
      SELECT * FROM approval_rules
      WHERE company_id = $1 
        AND is_active = true
        AND rule_type IN ('specific_approver', 'hybrid')
        AND ($2 >= min_amount OR min_amount IS NULL)
        AND ($2 <= max_amount OR max_amount IS NULL)
    `, [company_id, amount_in_company_currency]);

    for (const rule of rulesResult.rows) {
      if (rule.rule_type === 'specific_approver') {
        // Check if specific approver has approved
        const approvalResult = await pool.query(`
          SELECT status FROM expense_approvals
          WHERE expense_id = $1 AND approver_id = $2
        `, [expenseId, rule.specific_approver_id]);

        if (approvalResult.rows.length > 0 && approvalResult.rows[0].status === 'approved') {
          return { approved: true, rule: rule.name };
        }
      } else if (rule.rule_type === 'hybrid') {
        // Check both percentage and specific approver conditions
        const specificApprovalResult = await pool.query(`
          SELECT status FROM expense_approvals
          WHERE expense_id = $1 AND approver_id = $2
        `, [expenseId, rule.specific_approver_id]);

        const percentageResult = await checkPercentageApprovalRules(expenseId, null, null, rule.percentage_threshold);
        
        if ((specificApprovalResult.rows.length > 0 && specificApprovalResult.rows[0].status === 'approved') || 
            percentageResult.approved) {
          return { approved: true, rule: rule.name };
        }
      }
    }

    return { approved: false };
  } catch (error) {
    console.error('Error checking conditional approval rules:', error);
    return { approved: false };
  }
};

const checkPercentageApprovalRules = async (expenseId, approvedCount = null, totalCount = null, threshold = null) => {
  try {
    if (approvedCount === null || totalCount === null) {
      const approvalResult = await pool.query(`
        SELECT 
          COUNT(*) as total_approvals,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
        FROM expense_approvals
        WHERE expense_id = $1
      `, [expenseId]);

      approvedCount = parseInt(approvalResult.rows[0].approved_count);
      totalCount = parseInt(approvalResult.rows[0].total_approvals);
    }

    if (totalCount === 0) {
      return { approved: false };
    }

    const percentage = (approvedCount / totalCount) * 100;
    
    if (threshold) {
      return { approved: percentage >= threshold };
    }

    // Get applicable percentage rules
    const expenseResult = await pool.query(`
      SELECT e.amount_in_company_currency, e.company_id
      FROM expenses e
      WHERE e.id = $1
    `, [expenseId]);

    if (expenseResult.rows.length === 0) {
      return { approved: false };
    }

    const { amount_in_company_currency, company_id } = expenseResult.rows[0];

    const rulesResult = await pool.query(`
      SELECT percentage_threshold FROM approval_rules
      WHERE company_id = $1 
        AND is_active = true
        AND rule_type = 'percentage'
        AND ($2 >= min_amount OR min_amount IS NULL)
        AND ($2 <= max_amount OR max_amount IS NULL)
      ORDER BY percentage_threshold DESC
      LIMIT 1
    `, [company_id, amount_in_company_currency]);

    if (rulesResult.rows.length > 0) {
      const requiredPercentage = rulesResult.rows[0].percentage_threshold;
      return { approved: percentage >= requiredPercentage };
    }

    return { approved: false };
  } catch (error) {
    console.error('Error checking percentage approval rules:', error);
    return { approved: false };
  }
};

export const createApprovalNotification = async (expenseId, approverId) => {
  try {
    await pool.query(`
      INSERT INTO approval_notifications (expense_id, approver_id, notification_type)
      VALUES ($1, $2, 'approval_request')
    `, [expenseId, approverId]);
  } catch (error) {
    console.error('Error creating approval notification:', error);
  }
};

export const getExpenseApprovalStatus = async (expenseId) => {
  try {
    const result = await pool.query(`
      SELECT 
        ea.status,
        ea.comments,
        ea.approved_at,
        u.first_name,
        u.last_name,
        u.role
      FROM expense_approvals ea
      JOIN users u ON ea.approver_id = u.id
      WHERE ea.expense_id = $1
      ORDER BY ea.created_at
    `, [expenseId]);

    return result.rows;
  } catch (error) {
    console.error('Error getting expense approval status:', error);
    throw error;
  }
};
