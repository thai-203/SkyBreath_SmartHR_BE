import moment from 'moment';

export const formatDate = (date, format = 'YYYY-MM-DD') => {
    return moment(date).format(format);
};

export const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
    return moment(date).format(format);
};
