import { app, Container, Contracts } from "@arkecosystem/core-kernel";
import Boom from "@hapi/boom";

import { ServerCache } from "../../services";
import { paginate, respondWithResource, toPagination } from "../utils";

const findWallet = (id: string): Contracts.State.Wallet | Boom<null> => {
    let wallet: Contracts.State.Wallet | undefined;

    try {
        wallet = app
            .get<Contracts.Database.DatabaseService>(Container.Identifiers.DatabaseService)
            .wallets.findById(Contracts.Database.SearchScope.Wallets, id);
    } catch (error) {
        return Boom.notFound("Delegate not found");
    }

    if (!wallet.hasAttribute("delegate.username")) {
        return Boom.notFound("Delegate not found");
    }

    return wallet;
};

// todo: rework to make use of injection rather then manual resolving
const index = async request => {
    const delegates = app
        .get<Contracts.Database.DatabaseService>(Container.Identifiers.DatabaseService)
        .wallets.search(Contracts.Database.SearchScope.Delegates, {
            ...request.query,
            ...paginate(request),
        });

    return toPagination(delegates, "delegate");
};

const show = async request => {
    const delegate: Contracts.State.Wallet | Boom<null> = findWallet(request.params.id);

    if (delegate instanceof Boom) {
        return delegate;
    }

    return respondWithResource(delegate, "delegate");
};

const search = async request => {
    const delegates = app
        .get<Contracts.Database.DatabaseService>(Container.Identifiers.DatabaseService)
        .wallets.search(Contracts.Database.SearchScope.Delegates, {
            ...request.payload,
            ...request.query,
            ...paginate(request),
        });

    return toPagination(delegates, "delegate");
};

const blocks = async request => {
    const delegate: Contracts.State.Wallet | Boom<null> = findWallet(request.params.id);

    if (delegate instanceof Boom) {
        return delegate;
    }

    const rows = await app
        .get<Contracts.Database.DatabaseService>(Container.Identifiers.DatabaseService)
        .blocksBusinessRepository.findAllByGenerator(delegate.publicKey!, paginate(request));

    return toPagination(rows, "block", request.query.transform);
};

const voters = async request => {
    const delegate: Contracts.State.Wallet | Boom<null> = findWallet(request.params.id);

    if (delegate instanceof Boom) {
        return delegate;
    }

    const wallets = app
        .get<Contracts.Database.DatabaseService>(Container.Identifiers.DatabaseService)
        .wallets.search(Contracts.Database.SearchScope.Wallets, {
            ...request.query,
            ...{ vote: delegate.publicKey },
            ...paginate(request),
        });

    return toPagination(wallets, "wallet");
};

export const registerMethods = server => {
    ServerCache.make(server)
        .method("v2.delegates.index", index, 8, request => ({
            ...request.query,
            ...paginate(request),
        }))
        .method("v2.delegates.show", show, 8, request => ({ id: request.params.id }))
        .method("v2.delegates.search", search, 30, request => ({
            ...request.payload,
            ...request.query,
            ...paginate(request),
        }))
        .method("v2.delegates.blocks", blocks, 8, request => ({
            ...{ id: request.params.id },
            ...request.query,
            ...paginate(request),
        }))
        .method("v2.delegates.voters", voters, 8, request => ({
            ...{ id: request.params.id },
            ...paginate(request),
        }));
};
