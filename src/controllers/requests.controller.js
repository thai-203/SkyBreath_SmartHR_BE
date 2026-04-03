import { RequestsService } from '../services/requests.service.js';

export class RequestsController {
    constructor() {
        this.service = new RequestsService();
    }

    // GET /requests/my — Danh sách đơn của tôi
    getMyRequests = async (req, res, next) => {
        try {
            const result = await this.service.getMyRequests(req.query, req.user);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    // GET /requests/pending — Đơn chờ tôi duyệt
    getPendingApprovals = async (req, res, next) => {
        try {
            const result = await this.service.getPendingApprovals(req.query, req.user);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    // GET /requests — Tất cả đơn (HR/Admin)
    getAllRequests = async (req, res, next) => {
        try {
            const result = await this.service.getAllRequests(req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    // GET /requests/:id — Chi tiết đơn
    getById = async (req, res, next) => {
        try {
            const result = await this.service.getRequestDetail(parseInt(req.params.id), req.user);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    // GET /requests/workflow-preview?requestTypeId=&employeeId= — Xem trước workflow
    getWorkflowPreview = async (req, res, next) => {
        try {
            const { requestTypeId, employeeId } = req.query;
            if (!requestTypeId || !employeeId) {
                return res.status(400).json({ success: false, message: 'Thiếu requestTypeId hoặc employeeId' });
            }
            const result = await this.service.getWorkflowPreview(parseInt(requestTypeId), parseInt(employeeId));
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    // POST /requests/draft — Lưu nháp
    saveDraft = async (req, res, next) => {
        try {
            const result = await this.service.saveDraft(req.body, req.user);
            res.status(201).json({ success: true, data: result, message: 'Lưu nháp thành công' });
        } catch (error) {
            next(error);
        }
    };

    // POST /requests/:id/submit — Gửi duyệt
    submit = async (req, res, next) => {
        try {
            const result = await this.service.submitRequest(parseInt(req.params.id), req.body, req.user);
            res.json({ success: true, data: result, message: 'Gửi duyệt thành công' });
        } catch (error) {
            next(error);
        }
    };

    // POST /requests/:id/cancel — Hủy đơn
    cancel = async (req, res, next) => {
        try {
            const result = await this.service.cancelRequest(parseInt(req.params.id), req.user);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    // POST /requests/:id/approve — Phê duyệt
    approve = async (req, res, next) => {
        try {
            const result = await this.service.approveRequest(parseInt(req.params.id), req.user);
            res.json({ success: true, data: result, message: 'Phê duyệt thành công' });
        } catch (error) {
            next(error);
        }
    };

    // POST /requests/:id/reject — Từ chối
    reject = async (req, res, next) => {
        try {
            const result = await this.service.rejectRequest(parseInt(req.params.id), req.body, req.user);
            res.json({ success: true, data: result, message: 'Từ chối đơn thành công' });
        } catch (error) {
            next(error);
        }
    };

    // POST /requests/:id/revoke — Hủy duyệt
    revoke = async (req, res, next) => {
        try {
            const result = await this.service.revokeApproval(parseInt(req.params.id), req.body, req.user);
            res.json({ success: true, data: result, message: 'Hủy duyệt thành công' });
        } catch (error) {
            next(error);
        }
    };

    // POST /requests/:id/attachments — Upload tài liệu đính kèm
    uploadAttachments = async (req, res, next) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, message: 'Không có file nào được tải lên' });
            }
            const result = await this.service.saveAttachments(parseInt(req.params.id), req.files, req.user);
            res.status(201).json({ success: true, data: result, message: 'Tải lên tài liệu thành công' });
        } catch (error) {
            next(error);
        }
    };
}
