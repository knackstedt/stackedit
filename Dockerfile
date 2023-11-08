FROM nginx:1.23.4-alpine

COPY ./nginx.conf /etc/nginx/nginx.conf
RUN rm /etc/nginx/conf.d/default.conf

WORKDIR /app/

COPY dist/stackedit .

EXPOSE 80
