export class RequestsController {
    constructor(requestsService) {
        this.requestsService = requestsService;
    }

    getLeaveCalendar = async (req, res, next) => {
        try {
            const result = await this.requestsService.getLeaveCalendar(req.query, req.user);
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}
