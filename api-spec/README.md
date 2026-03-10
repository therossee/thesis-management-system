# PoliTO Thesis Management API Spec
The OpenAPI specification for the REST API for thesis management of Politecnico di Torino.

## How to obtain a human-readable interface
If you are accustomed to using Postman, you can just import the .yaml file containing the specification.

Alternatively, you can start a Docker container of swagger-ui directly on your computer by running: 
```bash
docker-compose up
``` 
This starts:
- Swagger UI on `http://localhost:8080`
- Prism mock server on `http://localhost:4010`

## About OpenAPI
These definitions provide a single point of truth that can be used end-to-end:

- **Planning** Shared during product discussions for planning API functionality
- **Implementation** Inform engineering during development
- **Testing** As the basis for testing or mocking API endpoints
- **Documentation** For producing thorough and interactive documentation
- **Tooling** To generate server stubs and client SDKs.

## Running a mock API
We suggest using [Prism](https://github.com/stoplightio/prism) to run a mock version of this API.

After installing it, you can start a mock server with the following command:
```bash
prism mock --host 127.0.0.1 --port 4010 --cors ./openapi.yaml
```

The OpenAPI spec includes two servers:
- `http://localhost:4010` for Prism mock
- `http://localhost:3001` for the local backend

If you open the spec in Swagger UI or Postman and see `Failed to fetch`, the request is usually going to the wrong server.
When you want to use Prism mocks, select the `Prism mock server` entry from the server dropdown.

If you still see `Failed to fetch`, check these points first:
- Prism must actually be running on port `4010`
- if you use the online Swagger Editor over `https`, browser mixed-content rules can block calls to `http://localhost:4010`
- local Swagger UI from this repository avoids that issue

## Resources

- [OAS3 Specification](http://spec.openapis.org/oas/v3.0.3)
- [OAS3 Examples](https://github.com/OAI/OpenAPI-Specification/tree/master/examples/v3.0)
