import React from "react";
import GraphiQL from "graphiql";
import "graphiql/graphiql.min.css";

export const GraphQLPlayground = () => {
  const token = localStorage.getItem("authToken");

  const fetcher = async (graphQLParams: any, opts: RequestInit = {}) => {
    const url = "http://localhost:3000/graphql";
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(graphQLParams),
    });

    return response.json();
  };

  const defaultQuery = `
  query GetMyTeams {
    teams {
      page
      totalPages
      totalCount
      items {
        id
        name
        createdAt
      }
    }
  }

  query MyProducts($page: Int, $limit: Int) {
    products(pagination: { page: $page, limit: $limit }) {
      totalCount
      totalPages
      items {
        id
        itemId
        status
      }
    }
  }

  # You can switch between queries using the drop-down next to the play button
  `;

  return <GraphiQL fetcher={fetcher} defaultQuery={defaultQuery} />;
};
